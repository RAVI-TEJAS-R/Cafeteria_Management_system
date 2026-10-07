import { useEffect, useState } from "react";
import type { Session } from "../../types/auth";
import type { CartItem, MenuItem } from "../../types/menu";
import { isMenuItemAvailable } from "../../types/menu";
import Header from "../common/Header";
import MenuView from "./MenuView";
import Cart from "./Cart";
import PickupWindowSelector from "./PickupWindowSelector";
import OrderHistory from "./OrderHistory";
import { useMenu } from "../../hooks/useMenu";
import { useOrders } from "../../hooks/useOrders";

interface StudentDashboardProps {
  session: Session;
  onLogout: () => void;
}

function StudentDashboard({
  session,
  onLogout,
}: StudentDashboardProps) {
  const { menu, menuLoading, message: menuMessage, loadMenu } =
    useMenu(session.token);
  const {
    orders,
    loadingOrders,
    orderHistoryMessage,
    fetchOrders,
    cancelOrder,
    placeOrder,
  } = useOrders(session.token);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPickupWindowId, setSelectedPickupWindowId] =
    useState<number | null>(null);
  const [orderMessage, setOrderMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] =
    useState<number | null>(null);

  useEffect(() => {
    loadMenu().catch((error) => {
      console.error("Menu loading error:", error);
    });

    fetchOrders();
  }, [loadMenu, fetchOrders]);

  // Keep cart item data synchronized with the latest menu stock.
  // If stock falls below the quantity already in the cart, clamp the
  // cart quantity so the student can never submit more than available.
  useEffect(() => {
    if (!menu) {
      return;
    }

    setCart((currentCart) => {
      let changed = false;
      let stockMessage = "";

      const synchronizedCart = currentCart
        .map((cartItem) => {
          const latestItem = menu.items.find(
            (item) => item.menuItemId === cartItem.item.menuItemId,
          );

          if (!latestItem) {
            changed = true;
            return null;
          }

          const stockQuantity = Number(latestItem.stockQuantity ?? 0);
          const nextQuantity = Math.min(
            cartItem.quantity,
            stockQuantity,
          );

          if (nextQuantity !== cartItem.quantity) {
            changed = true;
            stockMessage = `Only ${stockQuantity} portions of ${latestItem.itemName} are available.`;
          }

          if (nextQuantity <= 0) {
            changed = true;
            return null;
          }

          if (
            latestItem !== cartItem.item ||
            nextQuantity !== cartItem.quantity
          ) {
            changed = true;
          }

          return {
            ...cartItem,
            item: latestItem,
            quantity: nextQuantity,
          };
        })
        .filter((cartItem): cartItem is CartItem => cartItem !== null);

      if (stockMessage) {
        setOrderMessage(stockMessage);
      }

      return changed ? synchronizedCart : currentCart;
    });
  }, [menu]);

  function addToCart(item: MenuItem) {
    if (!isMenuItemAvailable(item)) {
      setOrderMessage("This item is currently unavailable.");
      return;
    }

    const stockQuantity = Number(item.stockQuantity ?? 0);

    setCart((currentCart) => {
      const existing = currentCart.find(
        (cartItem) =>
          cartItem.item.menuItemId === item.menuItemId,
      );

      if (existing) {
        if (existing.quantity >= stockQuantity) {
          setOrderMessage(
            `Only ${stockQuantity} portions of ${item.itemName} are available.`,
          );
          return currentCart;
        }

        return currentCart.map((cartItem) =>
          cartItem.item.menuItemId === item.menuItemId
            ? {
                ...cartItem,
                item,
                quantity: cartItem.quantity + 1,
              }
            : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          item,
          quantity: 1,
        },
      ];
    });

    setOrderMessage("");
  }

  function decreaseQuantity(menuItemId: number) {
    setCart((currentCart) =>
      currentCart
        .map((cartItem) =>
          cartItem.item.menuItemId === menuItemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity - 1,
              }
            : cartItem,
        )
        .filter((cartItem) => cartItem.quantity > 0),
    );

    setOrderMessage("");
  }

  function increaseQuantity(menuItemId: number) {
    setCart((currentCart) =>
      currentCart.map((cartItem) => {
        if (cartItem.item.menuItemId !== menuItemId) {
          return cartItem;
        }

        const stockQuantity = Number(
          cartItem.item.stockQuantity ?? 0,
        );

        if (cartItem.quantity >= stockQuantity) {
          setOrderMessage(
            `Only ${stockQuantity} portions of ${cartItem.item.itemName} are available.`,
          );
          return cartItem;
        }

        setOrderMessage("");

        return {
          ...cartItem,
          quantity: cartItem.quantity + 1,
        };
      }),
    );
  }

  function removeFromCart(menuItemId: number) {
    setCart((currentCart) =>
      currentCart.filter(
        (cartItem) =>
          cartItem.item.menuItemId !== menuItemId,
      ),
    );

    setOrderMessage("");
  }

  function getFriendlyOrderError(error: unknown): string {
    const message =
      error instanceof Error ? error.message : "";

    if (message.includes("ORA-20005")) {
      return "Insufficient stock available for one or more items.";
    }

    if (message.includes("ORA-20004")) {
      return "One or more selected items are currently unavailable.";
    }

    if (message.includes("ORA-20003")) {
      return "Invalid item quantity.";
    }

    if (message.includes("ORA-20002")) {
      return "The selected items could not be processed.";
    }

    if (
      message.toLowerCase().includes("pickup window") &&
      (
        message.toLowerCase().includes("full") ||
        message.toLowerCase().includes("capacity")
      )
    ) {
      return "The selected pickup window is full.";
    }

    return "Unable to place the order. Please try again.";
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) {
      setOrderMessage("Your cart is empty.");
      return;
    }

    if (selectedPickupWindowId === null) {
      setOrderMessage("Please select a pickup window.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage("");

    try {
      const data = await placeOrder({
        pickupWindowId: selectedPickupWindowId,
        items: cart.map((cartItem) => ({
          menuItemId: cartItem.item.menuItemId,
          quantity: cartItem.quantity,
        })),
      });

      setOrderMessage(
        `Order placed successfully. Pickup code: ${data.pickupCode}`,
      );

      setCart([]);
      setSelectedPickupWindowId(null);

      await loadMenu();
      await fetchOrders();
    } catch (error) {
      console.error("Place order error:", error);
      setOrderMessage(getFriendlyOrderError(error));
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function handleCancelOrder(orderId: number) {
    setCancellingOrderId(orderId);
    setOrderMessage("");

    try {
      await cancelOrder(orderId);

      setOrderMessage(
        `Order #${orderId} cancelled successfully.`,
      );

      await loadMenu();
      await fetchOrders();
    } catch (error) {
      console.error("Cancel order error:", error);
      setOrderMessage(
        "Unable to cancel the order. Please try again.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  const cartTotal = cart.reduce(
    (total, cartItem) =>
      total +
      Number(cartItem.item.price) * cartItem.quantity,
    0,
  );

  const cartQuantity = cart.reduce(
    (total, cartItem) => total + cartItem.quantity,
    0,
  );

  return (
    <main className="app-shell dashboard-shell">
      <Header
        fullName={session.fullName}
        role={session.role}
        subtitle="Preorder & Pickup"
        onLogout={onLogout}
      />

      <section className="dashboard-content">
        <div className="dashboard-intro">
          <div>
            <span className="eyebrow">Student Dashboard</span>

            <h2>Today's Menu</h2>

            <p>
              Browse today's cafeteria menu and choose
              your pickup window.
            </p>
          </div>

          <div className="date-card">
            <span>Menu date</span>

            <strong>
              {menu?.date ||
                new Date().toLocaleDateString("en-IN")}
            </strong>
          </div>
        </div>

        {!menuLoading &&
          menu &&
          menu.items.length === 0 && (
            <div className="empty-card">
              <h3>No menu available</h3>

              <p>
                There are no menu items available for
                this date.
              </p>
            </div>
          )}

        {menuMessage && (
          <div className="message" role="alert">
            {menuMessage}
          </div>
        )}

        <MenuView
          menu={menu}
          menuLoading={menuLoading}
          onAddToCart={addToCart}
        />

        <Cart
          cart={cart}
          cartQuantity={cartQuantity}
          cartTotal={cartTotal}
          onDecrease={decreaseQuantity}
          onIncrease={increaseQuantity}
          onRemove={removeFromCart}
        />

        <PickupWindowSelector
          pickupWindows={menu?.pickupWindows}
          selectedPickupWindowId={selectedPickupWindowId}
          onSelect={setSelectedPickupWindowId}
          onPlaceOrder={handlePlaceOrder}
          isPlacingOrder={isPlacingOrder}
          cartLength={cart.length}
          orderMessage={orderMessage}
        />

        <OrderHistory
          orders={orders}
          loadingOrders={loadingOrders}
          message={orderHistoryMessage}
          cancellingOrderId={cancellingOrderId}
          onRefresh={fetchOrders}
          onCancel={handleCancelOrder}
        />
      </section>
    </main>
  );
}

export default StudentDashboard;
