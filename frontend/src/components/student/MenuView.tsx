import { useMemo, useState } from "react";
import type { MenuItem, MenuResponse } from "../../types/menu";
import { isMenuItemAvailable } from "../../types/menu";
import MenuItemCard from "./MenuItemCard";

interface MenuViewProps {
  menu: MenuResponse | null;
  menuLoading: boolean;
  onAddToCart: (item: MenuItem) => void;
}

type AvailabilityFilter = "ALL" | "AVAILABLE" | "UNAVAILABLE";

function MenuView({
  menu,
  menuLoading,
  onAddToCart,
}: MenuViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("ALL");

  const filteredItems = useMemo(() => {
    if (!menu) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return menu.items.filter((item) => {
      const matchesSearch =
        normalizedSearch === "" ||
        item.itemName.toLowerCase().includes(normalizedSearch);

      const itemAvailable = isMenuItemAvailable(item);

      const matchesAvailability =
        availabilityFilter === "ALL" ||
        (availabilityFilter === "AVAILABLE" && itemAvailable) ||
        (availabilityFilter === "UNAVAILABLE" && !itemAvailable);

      return matchesSearch && matchesAvailability;
    });
  }, [menu, searchTerm, availabilityFilter]);

  if (menuLoading) {
    return (
      <div className="loading-card">
        Loading today's menu...
      </div>
    );
  }

  if (!menu || menu.items.length === 0) {
    return (
      <div className="empty-card">
        <h3>No menu available</h3>
        <p>There are no menu items available for this date.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="menu-filters">
        <div className="menu-search">
          <label htmlFor="menu-search">Search menu</label>

          <input
            id="menu-search"
            type="search"
            placeholder="Search by item name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="availability-filter">
          <span>Availability</span>

          <div className="filter-buttons">
            <button
              type="button"
              className={
                availabilityFilter === "ALL"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() => setAvailabilityFilter("ALL")}
            >
              All
            </button>

            <button
              type="button"
              className={
                availabilityFilter === "AVAILABLE"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() => setAvailabilityFilter("AVAILABLE")}
            >
              Available
            </button>

            <button
              type="button"
              className={
                availabilityFilter === "UNAVAILABLE"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() => setAvailabilityFilter("UNAVAILABLE")}
            >
              Unavailable
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-card">
          <h3>No matching menu items</h3>
          <p>
            Try a different search term or availability filter.
          </p>
        </div>
      ) : (
        <section className="menu-grid">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.menuItemId}
              item={item}
              onAddToCart={onAddToCart}
            />
          ))}
        </section>
      )}
    </section>
  );
}

export default MenuView;
