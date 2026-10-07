import type { MenuItem } from "../../types/menu";
import { isMenuItemAvailable } from "../../types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const stockQuantity = Number(item.stockQuantity ?? 0);
  const itemAvailable = isMenuItemAvailable(item);

  return (
    <article className="menu-card">
      <div className="menu-card-top">
        <span className="menu-category">MENU ITEM</span>

        <span
          className={
            itemAvailable
              ? "availability available"
              : "availability unavailable"
          }
        >
          {itemAvailable ? "Available" : "Unavailable"}
        </span>
      </div>

      <h3>{item.itemName}</h3>

      {item.description && (
        <p className="menu-description">{item.description}</p>
      )}

      <div className="menu-price">
        ₹{Number(item.price).toFixed(2)}
      </div>

      <div className="menu-detail">
        <span>Remaining stock</span>
        <p>
          {stockQuantity} {stockQuantity === 1 ? "portion" : "portions"} remaining
        </p>
      </div>

      {item.ingredients && item.ingredients.length > 0 && (
        <div className="menu-detail">
          <span>Ingredients</span>
          <p>{item.ingredients.join(", ")}</p>
        </div>
      )}

      {item.dietaryLabels && item.dietaryLabels.length > 0 && (
        <div className="labels">
          {item.dietaryLabels.map((label) => (
            <span key={label} className="label">
              {label}
            </span>
          ))}
        </div>
      )}

      {item.allergenLabels && item.allergenLabels.length > 0 && (
        <div className="menu-detail">
          <span>Allergens</span>
          <p>{item.allergenLabels.join(", ")}</p>
        </div>
      )}

      <button
        type="button"
        className="primary-button menu-button"
        disabled={!itemAvailable}
        onClick={() => onAddToCart(item)}
      >
        {itemAvailable ? "Add to order" : "Unavailable"}
      </button>
    </article>
  );
}

export default MenuItemCard;
