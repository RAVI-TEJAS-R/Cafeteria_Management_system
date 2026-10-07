import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3000/api";

interface LoginResponse {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

interface MenuItem {
  menuItemId: number;
  itemName: string;
  description?: string;
  price: number;
  isAvailable: string;
  ingredients?: string[];
  dietaryLabels?: string[];
  allergenLabels?: string[];
}

interface MenuResponse {
  date: string;
  items: MenuItem[];
  pickupWindows?: {
    pickupWindowId: number;
    startTime: string;
    endTime: string;
    capacity: number;
    reservedCount: number;
    availableCapacity: number;
  }[];
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface OrderHistoryItem {
  orderId: number;
  pickupCode: string;
  orderStatus: string;
  totalAmount: number;
  orderedAt: string;
  startTime: string;
  endTime: string;
}

interface QueueOrder {
  orderId: number;
  pickupCode: string;
  orderStatus: string;
  totalAmount: number;
  orderedAt: string;
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState<MenuResponse | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [selectedPickupWindowId, setSelectedPickupWindowId] =
    useState<number | null>(null);

  const [orderMessage, setOrderMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] =
    useState<number | null>(null);

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderHistoryMessage, setOrderHistoryMessage] = useState("");

  const [session, setSession] = useState<LoginResponse | null>(null);

  const [staffPickupWindowId, setStaffPickupWindowId] =
    useState<number | null>(null);
  const [staffQueue, setStaffQueue] = useState<QueueOrder[]>([]);
  const [staffQueueLoading, setStaffQueueLoading] = useState(false);
  const [staffQueueMessage, setStaffQueueMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("cafeteria_token", data.token);

      localStorage.setItem(
        "cafeteria_user",
        JSON.stringify({
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        })
      );

      setSession(data);
      setMessage("Login successful.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to API."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMenu() {
    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      return;
    }

    setMenuLoading(true);
    setMessage("");

    const today = new Date().toISOString().split("T")[0];

    try {
      const response = await fetch(
        `${API_BASE}/menu?date=${today}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load menu.");
      }

      setMenu(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load today's menu."
      );
    } finally {
      setMenuLoading(false);
    }
  }

  async function fetchOrders() {
    if (!session?.token) {
      return;
    }

    setLoadingOrders(true);
    setOrderHistoryMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/orders/history`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setOrderHistoryMessage(
          data.error ?? "Failed to load order history."
        );
        return;
      }

      setOrders(data.orders ?? []);
    } catch (error) {
      console.error("Order history error:", error);

      setOrderHistoryMessage(
        "Unable to connect to the backend."
      );
    } finally {
      setLoadingOrders(false);
    }
  }

  async function cancelOrder(orderId: number) {
    const token = localStorage.getItem("cafeteria_token");

    if (!token) {
      setOrderMessage("Please log in again.");
      return;
    }

    setCancellingOrderId(orderId);
    setOrderMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setOrderMessage(
          data.error ||
            data.message ||
            "Unable to cancel order."
        );
        return;
      }

      setOrderMessage(
        `Order #${orderId} cancelled successfully.`
      );

      await fetchOrders();
      await loadMenu();
    } catch (error) {
      console.error("Cancel order error:", error);

      setOrderMessage(
        "Unable to connect to the backend."
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  async function loadStaffQueue(pickupWindowId: number) {
    if (!session?.token) {
      return;
    }

    setStaffQueueLoading(true);
    setStaffQueueMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/orders/queue?pickupWindowId=${pickupWindowId}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setStaffQueueMessage(
          data.error ?? "Failed to load pickup queue."
        );
        setStaffQueue([]);
        return;
      }

      setStaffQueue(data.queue ?? []);
    } catch (error) {
      console.error("Staff queue error:", error);
      setStaffQueueMessage(
        "Unable to connect to the backend."
      );
      setStaffQueue([]);
    } finally {
      setStaffQueueLoading(false);
    }
  }

  async function updateOrderStatus(
    orderId: number,
    status: string
  ) {
    if (!session?.token) {
      return;
    }

    setUpdatingOrderId(orderId);
    setStaffQueueMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setStaffQueueMessage(
          data.error ??
            data.message ??
            "Failed to update order status."
        );
        return;
      }

      if (staffPickupWindowId !== null) {
        await loadStaffQueue(staffPickupWindowId);
      }
    } catch (error) {
      console.error("Order status update error:", error);
      setStaffQueueMessage(
        "Unable to connect to the backend."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function getNextStatus(status: string) {
    if (status === "PLACED") return "PREPARING";
    if (status === "PREPARING") return "READY";
    if (status === "READY") return "COLLECTED";
    return null;
  }

  function addToCart(item: MenuItem) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (cartItem) =>
          cartItem.item.menuItemId === item.menuItemId
      );

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem.item.menuItemId === item.menuItemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
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
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  }

  function increaseQuantity(menuItemId: number) {
    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.item.menuItemId === menuItemId
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem
      )
    );
  }

  function removeFromCart(menuItemId: number) {
    setCart((currentCart) =>
      currentCart.filter(
        (cartItem) =>
          cartItem.item.menuItemId !== menuItemId
      )
    );
  }

  async function placeOrder() {
    if (cart.length === 0) {
      setOrderMessage("Your cart is empty.");
      return;
    }

    if (selectedPickupWindowId === null) {
      setOrderMessage("Please select a pickup window.");
      return;
    }

    if (!session?.token) {
      setOrderMessage("Please log in again.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            pickupWindowId: selectedPickupWindowId,
            items: cart.map((cartItem) => ({
              menuItemId: cartItem.item.menuItemId,
              quantity: cartItem.quantity,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setOrderMessage(
          data.error ?? "Failed to place order."
        );
        return;
      }

      setOrderMessage(
        `Order placed successfully. Pickup code: ${data.pickupCode}`
      );

      setCart([]);
      setSelectedPickupWindowId(null);

      await fetchOrders();
      await loadMenu();
    } catch (error) {
      console.error("Place order error:", error);

      setOrderMessage(
        "Unable to connect to the backend."
      );
    } finally {
      setIsPlacingOrder(false);
    }
  }

  const cartTotal = cart.reduce(
    (total, cartItem) =>
      total +
      Number(cartItem.item.price) * cartItem.quantity,
    0
  );

  const cartQuantity = cart.reduce(
    (total, cartItem) =>
      total + cartItem.quantity,
    0
  );

  function handleLogout() {
    localStorage.removeItem("cafeteria_token");
    localStorage.removeItem("cafeteria_user");

    setSession(null);
    setMenu(null);
    setCart([]);
    setOrders([]);
    setSelectedPickupWindowId(null);
    setStaffPickupWindowId(null);
    setStaffQueue([]);
    setStaffQueueMessage("");

    setEmail("");
    setPassword("");
    setMessage("");
    setOrderMessage("");
  }

  useEffect(() => {
    if (session?.role === "STUDENT") {
      loadMenu();
      fetchOrders();
    }

    if (
      session?.role === "STAFF" ||
      session?.role === "ADMIN"
    ) {
      loadMenu();
    }
  }, [session]);

  if (session?.role === "STAFF" || session?.role === "ADMIN") {
    return (
      <main className="app-shell dashboard-shell">
        <header className="dashboard-header">
          <div className="brand">
            <span className="brand-mark">CC</span>
            <div>
              <h1>Campus Cafeteria</h1>
              <p>Staff Pickup Operations</p>
            </div>
          </div>

          <div className="header-user">
            <div>
              <strong>{session.fullName}</strong>
              <span>{session.role}</span>
            </div>
            <button
              className="secondary-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-intro">
            <div>
              <span className="eyebrow">
                {session.role === "ADMIN"
                  ? "Administrator Dashboard"
                  : "Staff Dashboard"}
              </span>
              <h2>Pickup Queue</h2>
              <p>
                Select a pickup window and manage orders
                through the cafeteria pickup workflow.
              </p>
            </div>

            <div className="date-card">
              <span>Today's date</span>
              <strong>
                {menu?.date ||
                  new Date().toLocaleDateString("en-IN")}
              </strong>
            </div>
          </div>

          {message && (
            <div className="message" role="alert">
              {message}
            </div>
          )}

          {menuLoading && (
            <div className="loading-card">
              Loading pickup windows...
            </div>
          )}

          <section className="pickup-window-section">
            <h2>Select Pickup Window</h2>

            {menu?.pickupWindows?.length === 0 && (
              <p>No pickup windows available.</p>
            )}

            <div className="pickup-window-list">
              {menu?.pickupWindows?.map((window) => (
                <button
                  key={window.pickupWindowId}
                  type="button"
                  onClick={() => {
                    setStaffPickupWindowId(
                      window.pickupWindowId
                    );
                    loadStaffQueue(
                      window.pickupWindowId
                    );
                  }}
                  className={
                    staffPickupWindowId ===
                    window.pickupWindowId
                      ? "pickup-window selected"
                      : "pickup-window"
                  }
                >
                  <strong>
                    {window.startTime} -{" "}
                    {window.endTime}
                  </strong>
                  <span>
                    {window.reservedCount} reserved /{" "}
                    {window.capacity} capacity
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="orders-section">
            <div className="section-header">
              <div>
                <span className="eyebrow">Operations</span>
                <h2>Pickup Queue</h2>
              </div>

              {staffPickupWindowId !== null && (
                <button
                  type="button"
                  onClick={() =>
                    loadStaffQueue(
                      staffPickupWindowId
                    )
                  }
                  disabled={staffQueueLoading}
                >
                  {staffQueueLoading
                    ? "Refreshing..."
                    : "Refresh Queue"}
                </button>
              )}
            </div>

            {staffQueueMessage && (
              <p className="order-message">
                {staffQueueMessage}
              </p>
            )}

            {staffPickupWindowId === null && (
              <p>
                Select a pickup window to view its queue.
              </p>
            )}

            {staffPickupWindowId !== null &&
              staffQueueLoading && (
                <div className="loading-card">
                  Loading pickup queue...
                </div>
              )}

            {staffPickupWindowId !== null &&
              !staffQueueLoading &&
              staffQueue.length === 0 && (
                <div className="empty-card">
                  <h3>No orders in this queue</h3>
                  <p>
                    There are currently no active orders
                    for the selected pickup window.
                  </p>
                </div>
              )}

            {!staffQueueLoading &&
              staffQueue.length > 0 && (
                <div className="orders-list">
                  {staffQueue.map((order) => {
                    const nextStatus =
                      getNextStatus(order.orderStatus);

                    return (
                      <div
                        className="order-card"
                        key={order.orderId}
                      >
                        <div>
                          <h3>
                            Order #{order.orderId}
                          </h3>
                          <p>
                            Pickup code:{" "}
                            <strong>
                              {order.pickupCode}
                            </strong>
                          </p>
                          <p>
                            Ordered:{" "}
                            {new Date(
                              order.orderedAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p>
                            Total:{" "}
                            <strong>
                              ₹{order.totalAmount}
                            </strong>
                          </p>
                          <p>
                            Status:{" "}
                            <strong>
                              {order.orderStatus}
                            </strong>
                          </p>

                          {nextStatus && (
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() =>
                                updateOrderStatus(
                                  order.orderId,
                                  nextStatus
                                )
                              }
                              disabled={
                                updatingOrderId ===
                                order.orderId
                              }
                            >
                              {updatingOrderId ===
                              order.orderId
                                ? "Updating..."
                                : `Mark ${nextStatus}`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>
        </section>
      </main>
    );
  }

  if (session) {
    return (
      <main className="app-shell dashboard-shell">
        <header className="dashboard-header">
          <div className="brand">
            <span className="brand-mark">CC</span>

            <div>
              <h1>Campus Cafeteria</h1>
              <p>Preorder & Pickup</p>
            </div>
          </div>

          <div className="header-user">
            <div>
              <strong>{session.fullName}</strong>
              <span>{session.role}</span>
            </div>

            <button
              className="secondary-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-intro">
            <div>
              <span className="eyebrow">
                Student Dashboard
              </span>

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

          {message && (
            <div className="message" role="alert">
              {message}
            </div>
          )}

          {menuLoading && (
            <div className="loading-card">
              Loading today's menu...
            </div>
          )}

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

          {!menuLoading &&
            menu &&
            menu.items.length > 0 && (
              <section className="menu-grid">
                {menu.items.map((item) => (
                  <article
                    className="menu-card"
                    key={item.menuItemId}
                  >
                    <div className="menu-card-top">
                      <span className="menu-category">
                        MENU ITEM
                      </span>

                      <span
                        className={
                          item.isAvailable === "Y"
                            ? "availability available"
                            : "availability unavailable"
                        }
                      >
                        {item.isAvailable === "Y"
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </div>

                    <h3>{item.itemName}</h3>

                    {item.description && (
                      <p className="menu-description">
                        {item.description}
                      </p>
                    )}

                    <div className="menu-price">
                      ₹{Number(item.price).toFixed(2)}
                    </div>

                    {item.ingredients &&
                      item.ingredients.length > 0 && (
                        <div className="menu-detail">
                          <span>Ingredients</span>

                          <p>
                            {item.ingredients.join(", ")}
                          </p>
                        </div>
                      )}

                    {item.dietaryLabels &&
                      item.dietaryLabels.length > 0 && (
                        <div className="labels">
                          {item.dietaryLabels.map(
                            (label) => (
                              <span
                                key={label}
                                className="label"
                              >
                                {label}
                              </span>
                            )
                          )}
                        </div>
                      )}

                    {item.allergenLabels &&
                      item.allergenLabels.length > 0 && (
                        <div className="menu-detail">
                          <span>Allergens</span>

                          <p>
                            {item.allergenLabels.join(
                              ", "
                            )}
                          </p>
                        </div>
                      )}

                    <button
                      className="primary-button menu-button"
                      disabled={
                        item.isAvailable !== "Y"
                      }
                      onClick={() =>
                        addToCart(item)
                      }
                    >
                      {item.isAvailable === "Y"
                        ? "Add to order"
                        : "Unavailable"}
                    </button>
                  </article>
                ))}
              </section>
            )}

          {cart.length > 0 && (
            <section className="cart-section">
              <div className="cart-heading">
                <div>
                  <span className="eyebrow">
                    Your selection
                  </span>

                  <h2>Order Cart</h2>
                </div>

                <span className="cart-count">
                  {cartQuantity} item
                  {cartQuantity !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="cart-list">
                {cart.map((cartItem) => (
                  <div
                    className="cart-item"
                    key={cartItem.item.menuItemId}
                  >
                    <div className="cart-item-info">
                      <strong>
                        {cartItem.item.itemName}
                      </strong>

                      <span>
                        ₹
                        {Number(
                          cartItem.item.price
                        ).toFixed(2)}{" "}
                        each
                      </span>
                    </div>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(
                            cartItem.item.menuItemId
                          )
                        }
                      >
                        -
                      </button>

                      <strong>
                        {cartItem.quantity}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(
                            cartItem.item.menuItemId
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <strong className="cart-item-total">
                      ₹
                      {(
                        Number(
                          cartItem.item.price
                        ) *
                        cartItem.quantity
                      ).toFixed(2)}
                    </strong>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() =>
                        removeFromCart(
                          cartItem.item.menuItemId
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <span>Total</span>

                <strong>
                  ₹{cartTotal.toFixed(2)}
                </strong>
              </div>
            </section>
          )}

          <section className="pickup-window-section">
            <h2>Choose Pickup Window</h2>

            {menu?.pickupWindows?.length === 0 && (
              <p>No pickup windows available.</p>
            )}

            <div className="pickup-window-list">
              {menu?.pickupWindows?.map(
                (window) => (
                  <button
                    key={window.pickupWindowId}
                    type="button"
                    disabled={
                      window.availableCapacity <= 0
                    }
                    onClick={() =>
                      setSelectedPickupWindowId(
                        window.pickupWindowId
                      )
                    }
                    className={
                      selectedPickupWindowId ===
                      window.pickupWindowId
                        ? "pickup-window selected"
                        : "pickup-window"
                    }
                  >
                    <strong>
                      {window.startTime} -{" "}
                      {window.endTime}
                    </strong>

                    <span>
                      {window.availableCapacity}{" "}
                      slots available
                    </span>
                  </button>
                )
              )}
            </div>

            {selectedPickupWindowId !== null && (
              <p>
                Selected pickup window:{" "}
                <strong>
                  {
                    menu?.pickupWindows?.find(
                      (window) =>
                        window.pickupWindowId ===
                        selectedPickupWindowId
                    )?.startTime
                  }{" "}
                  -{" "}
                  {
                    menu?.pickupWindows?.find(
                      (window) =>
                        window.pickupWindowId ===
                        selectedPickupWindowId
                    )?.endTime
                  }
                </strong>
              </p>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={placeOrder}
              disabled={
                isPlacingOrder ||
                cart.length === 0 ||
                selectedPickupWindowId === null
              }
            >
              {isPlacingOrder
                ? "Placing Order..."
                : "Place Order"}
            </button>

            {orderMessage && (
              <p className="order-message">
                {orderMessage}
              </p>
            )}
          </section>

          <section className="orders-section">
            <div className="section-header">
              <div>
                <span className="eyebrow">
                  Account
                </span>

                <h2>My Orders</h2>
              </div>

              <button
                type="button"
                onClick={fetchOrders}
                disabled={loadingOrders}
              >
                {loadingOrders
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {orderHistoryMessage && (
              <p className="order-message">
                {orderHistoryMessage}
              </p>
            )}

            {!loadingOrders &&
              orders.length === 0 && (
                <p>No orders found.</p>
              )}

            <div className="orders-list">
              {orders.map((order) => (
                <div
                  className="order-card"
                  key={order.orderId}
                >
                  <div>
                    <h3>
                      Order #{order.orderId}
                    </h3>

                    <p>
                      Pickup code:{" "}
                      <strong>
                        {order.pickupCode}
                      </strong>
                    </p>

                    <p>
                      Pickup:{" "}
                      <strong>
                        {order.startTime} -{" "}
                        {order.endTime}
                      </strong>
                    </p>

                    <p>
                      Ordered:{" "}
                      {new Date(
                        order.orderedAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p>
                      Total:{" "}
                      <strong>
                        ₹{order.totalAmount}
                      </strong>
                    </p>

                    <p>
                      Status:{" "}
                      <strong>
                        {order.orderStatus}
                      </strong>
                    </p>

                    {order.orderStatus === "PLACED" && (
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() =>
                          cancelOrder(order.orderId)
                        }
                        disabled={
                          cancellingOrderId ===
                          order.orderId
                        }
                      >
                        {cancellingOrderId ===
                        order.orderId
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">
            CC
          </span>

          <div>
            <h1>Campus Cafeteria</h1>
            <p>Preorder & Pickup</p>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">
            Campus food ordering
          </span>

          <h2>Sign in</h2>

          <p>
            Sign in to browse menus, manage orders,
            or operate the cafeteria queue.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@cafeteria.local"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {message && (
          <div
            className="message"
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="demo-accounts">
          <h3>Local demo accounts</h3>

          <p>
            Student:
            teststudent2@cafeteria.local
          </p>

          <p>
            Staff:
            staff@cafeteria.local
          </p>

          <p>
            Admin:
            admin@cafeteria.local
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
