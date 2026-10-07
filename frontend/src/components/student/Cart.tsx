import type { CartItem } from "../../types/menu";

interface CartProps {
  cart: CartItem[];
  cartQuantity: number;
  cartTotal: number;
  onDecrease: (menuItemId: number) => void;
  onIncrease: (menuItemId: number) => void;
  onRemove: (menuItemId: number) => void;
}

function Cart({
  cart,
  cartQuantity,
  cartTotal,
  onDecrease,
  onIncrease,
  onRemove,
}: CartProps) {
  if (cart.length === 0) {
    return null;
  }

  return (
    <section className="cart-section">
      <div className="cart-heading">
        <div>
          <span className="eyebrow">Your selection</span>
          <h2>Order Cart</h2>
        </div>

        <span className="cart-count">
          {cartQuantity} item{cartQuantity !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="cart-list">
        {cart.map((cartItem) => {
          const stockQuantity = Number(
            cartItem.item.stockQuantity ?? 0,
          );
          const isAtStockLimit =
            cartItem.quantity >= stockQuantity;

          return (
            <div
              className="cart-item"
              key={cartItem.item.menuItemId}
            >
              <div className="cart-item-info">
                <strong>{cartItem.item.itemName}</strong>

                <span>
                  ₹{Number(cartItem.item.price).toFixed(2)} each
                </span>

                {isAtStockLimit && stockQuantity > 0 && (
                  <small className="cart-stock-message">
                    Only {stockQuantity} portions available.
                  </small>
                )}

                {stockQuantity === 0 && (
                  <small className="cart-stock-message">
                    This item is currently out of stock.
                  </small>
                )}
              </div>

              <div className="quantity-controls">
                <button
                  type="button"
                  aria-label={`Decrease ${cartItem.item.itemName} quantity`}
                  onClick={() => onDecrease(cartItem.item.menuItemId)}
                >
                  -
                </button>

                <strong>{cartItem.quantity}</strong>

                <button
                  type="button"
                  aria-label={`Increase ${cartItem.item.itemName} quantity`}
                  disabled={
                    stockQuantity <= 0 ||
                    cartItem.quantity >= stockQuantity
                  }
                  onClick={() => onIncrease(cartItem.item.menuItemId)}
                >
                  +
                </button>
              </div>

              <strong className="cart-item-total">
                ₹
                {(
                  Number(cartItem.item.price) *
                  cartItem.quantity
                ).toFixed(2)}
              </strong>

              <button
                type="button"
                className="remove-button"
                onClick={() => onRemove(cartItem.item.menuItemId)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <span>Total</span>
        <strong>₹{cartTotal.toFixed(2)}</strong>
      </div>
    </section>
  );
}

export default Cart;
