import { useEffect, useMemo, useState } from "react";
import type { Session } from "../../types/auth";
import {
  createIngredient,
  createMenuDate,
  createMenuItem,
  createPickupWindow,
  deleteMenuItem,
  deletePickupWindow,
  updateMenuDatePublication,
  updateMenuItem,
  updateMenuItemStock,
  updatePickupWindow,
} from "../../services/menuApi";
import { useMenu } from "../../hooks/useMenu";
import Reports from "./Reports";
import StaffManagement from "./StaffManagement";

interface AdminDashboardProps {
  session: Session;
  onLogout: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AdminDashboard({
  session,
  onLogout,
}: AdminDashboardProps) {
  const token = session.token;

  const {
    adminMenu,
    menuDates,
    ingredients,
    pickupWindows,
    menuLoading,
    message,
    setMessage,
    loadAdminMenu,
    loadAdminMenuDates,
    loadAdminPickupWindows,
    loadIngredients,
  } = useMenu(token);

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [newDate, setNewDate] = useState(todayString());
  const [newDatePublished, setNewDatePublished] = useState("N");

  const [pickupStartTime, setPickupStartTime] = useState("12:00");
  const [pickupEndTime, setPickupEndTime] = useState("12:30");
  const [pickupCapacity, setPickupCapacity] = useState("20");

  const [editingPickupWindowId, setEditingPickupWindowId] = useState<
    number | null
  >(null);
  const [editPickupStartTime, setEditPickupStartTime] = useState("");
  const [editPickupEndTime, setEditPickupEndTime] = useState("");
  const [editPickupCapacity, setEditPickupCapacity] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState("50");
  const [itemAvailable, setItemAvailable] = useState("Y");
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>(
    [],
  );

  const [newIngredient, setNewIngredient] = useState("");

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAvailable, setEditAvailable] = useState("Y");
  const [editStock, setEditStock] = useState("");

  const selectedMenuDate = useMemo(
    () => menuDates.find((date) => date.menuDate === selectedDate),
    [menuDates, selectedDate],
  );

  const refresh = async (date = selectedDate) => {
    try {
      await Promise.all([
        loadAdminMenuDates(),
        loadIngredients(),
        loadAdminPickupWindows(date),
        loadAdminMenu(date),
      ]);
    } catch {
      // Hook already exposes the error message.
    }
  };

  useEffect(() => {
    refresh(selectedDate);
    // Initial admin dashboard load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDate = async (date: string) => {
    cancelEditPickupWindow();
    setSelectedDate(date);

    try {
      await Promise.all([
        loadAdminMenu(date),
        loadAdminPickupWindows(date),
      ]);
    } catch {
      // Hook already handles the message.
    }
  };

  const handleCreateDate = async (
    event: React.SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setMessage("");

    try {
      await createMenuDate(token, {
        menuDate: newDate,
        isPublished: newDatePublished,
      });

      setSelectedDate(newDate);
      await refresh(newDate);

      setMessage("Menu date created successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create menu date.",
      );
    }
  };

  const handlePublicationToggle = async () => {
    if (!selectedMenuDate) {
      return;
    }

    const nextValue =
      selectedMenuDate.isPublished === "Y" ? "N" : "Y";

    try {
      await updateMenuDatePublication(
        token,
        selectedMenuDate.menuDateId,
        nextValue,
      );

      await refresh(selectedDate);

      setMessage(
        nextValue === "Y"
          ? "Menu published successfully."
          : "Menu unpublished successfully.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update menu publication status.",
      );
    }
  };

  const handleCreatePickupWindow = async (
    event: React.SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedMenuDate) {
      setMessage("Create or select a menu date first.");
      return;
    }

    if (pickupStartTime >= pickupEndTime) {
      setMessage("End time must be later than start time.");
      return;
    }

    const capacity = Number(pickupCapacity);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setMessage("Capacity must be a positive whole number.");
      return;
    }

    try {
      await createPickupWindow(token, {
        menuDate: selectedDate,
        startTime: pickupStartTime,
        endTime: pickupEndTime,
        capacity,
      });

      await refresh(selectedDate);

      setMessage("Pickup window created successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create pickup window.",
      );
    }
  };

  const beginEditPickupWindow = (
    pickupWindowId: number,
    startTime: string,
    endTime: string,
    capacity: number,
  ) => {
    setEditingPickupWindowId(pickupWindowId);
    setEditPickupStartTime(startTime);
    setEditPickupEndTime(endTime);
    setEditPickupCapacity(String(capacity));
  };

  const cancelEditPickupWindow = () => {
    setEditingPickupWindowId(null);
    setEditPickupStartTime("");
    setEditPickupEndTime("");
    setEditPickupCapacity("");
  };

  const handleSavePickupWindow = async () => {
    if (editingPickupWindowId === null) {
      return;
    }

    if (editPickupStartTime >= editPickupEndTime) {
      setMessage("End time must be later than start time.");
      return;
    }

    const capacity = Number(editPickupCapacity);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setMessage("Capacity must be a positive whole number.");
      return;
    }

    try {
      await updatePickupWindow(token, editingPickupWindowId, {
        startTime: editPickupStartTime,
        endTime: editPickupEndTime,
        capacity,
      });

      cancelEditPickupWindow();
      await refresh(selectedDate);

      setMessage("Pickup window updated successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update pickup window.",
      );
    }
  };

  const handleDeletePickupWindow = async (
    pickupWindowId: number,
    startTime: string,
    endTime: string,
    reservedCount: number,
  ) => {
    if (reservedCount > 0) {
      setMessage(
        "This pickup window cannot be deleted because it already has reserved orders.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete pickup window ${startTime} - ${endTime}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePickupWindow(token, pickupWindowId);

      if (editingPickupWindowId === pickupWindowId) {
        cancelEditPickupWindow();
      }

      await refresh(selectedDate);

      setMessage("Pickup window deleted successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete pickup window.",
      );
    }
  };

  const handleDeleteItem = async (
    menuItemId: number,
    itemName: string,
  ) => {
    const confirmed = window.confirm(
      `Delete "${itemName}" from this menu?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMenuItem(token, menuItemId);

      if (editingItemId === menuItemId) {
        cancelEdit();
      }

      await refresh(selectedDate);
      setMessage("Menu item deleted successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete menu item.",
      );
    }
  };

  const handleCreateIngredient = async (
    event: React.SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = newIngredient.trim();

    if (!name) {
      return;
    }

    try {
      await createIngredient(token, {
        ingredientName: name,
      });

      setNewIngredient("");
      await loadIngredients();

      setMessage("Ingredient created successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create ingredient.",
      );
    }
  };

  const handleCreateItem = async (
    event: React.SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedMenuDate) {
      setMessage("Create or select a menu date first.");
      return;
    }

    try {
      await createMenuItem(token, {
        menuDateId: selectedMenuDate.menuDateId,
        itemName,
        description: itemDescription,
        price: Number(itemPrice),
        isAvailable: itemAvailable,
        stockQuantity: Number(itemStock),
        ingredientIds: selectedIngredients,
      });

      setItemName("");
      setItemDescription("");
      setItemPrice("");
      setItemStock("50");
      setItemAvailable("Y");
      setSelectedIngredients([]);

      await refresh(selectedDate);

      setMessage("Menu item created successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create menu item.",
      );
    }
  };

  const beginEdit = (
    menuItemId: number,
    name: string,
    description: string,
    price: number,
    available: string,
    stock: number,
  ) => {
    setEditingItemId(menuItemId);
    setEditName(name);
    setEditDescription(description);
    setEditPrice(String(price));
    setEditAvailable(available);
    setEditStock(String(stock));
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditAvailable("Y");
    setEditStock("");
  };

  const handleSaveItem = async () => {
    if (editingItemId === null) {
      return;
    }

    try {
      await updateMenuItem(token, editingItemId, {
        itemName: editName,
        description: editDescription,
        price: Number(editPrice),
        isAvailable: editAvailable,
      });

      await updateMenuItemStock(token, editingItemId, {
        availableQty: Number(editStock),
      });

      cancelEdit();

      await refresh(selectedDate);

      setMessage("Menu item updated successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update menu item.",
      );
    }
  };

  const toggleIngredient = (ingredientId: number) => {
    setSelectedIngredients((current) =>
      current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId],
    );
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <div className="admin-eyebrow">CAMPUS CAFETERIA</div>

          <h1>Administration</h1>

          <p>
            Manage menu dates, menu items, ingredients, availability and
            stock.
          </p>
        </div>

        <div className="admin-header-actions">
          <span className="admin-user">
            {session.fullName} · ADMIN
          </span>

          <button
            type="button"
            className="secondary-button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">MENU CALENDAR</span>

            <h2>Menu Dates</h2>
          </div>
        </div>

        <div className="admin-grid admin-grid-two">
          <form
            className="admin-card"
            onSubmit={handleCreateDate}
          >
            <h3>Create Menu Date</h3>

            <label>
              Date

              <input
                type="date"
                value={newDate}
                onChange={(event) =>
                  setNewDate(event.target.value)
                }
                required
              />
            </label>

            <label>
              Initial Status

              <select
                value={newDatePublished}
                onChange={(event) =>
                  setNewDatePublished(event.target.value)
                }
              >
                <option value="N">Unpublished</option>
                <option value="Y">Published</option>
              </select>
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={menuLoading}
            >
              Create Menu Date
            </button>
          </form>

          <div className="admin-card">
            <h3>Existing Dates</h3>

            <div className="menu-date-list">
              {menuDates.length === 0 && (
                <p className="admin-empty">
                  No menu dates found.
                </p>
              )}

              {menuDates.map((date) => (
                <button
                  type="button"
                  key={date.menuDateId}
                  className={`menu-date-row ${
                    selectedDate === date.menuDate
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleSelectDate(date.menuDate)
                  }
                >
                  <span>
                    <strong>{date.menuDate}</strong>

                    <small>
                      {date.itemCount} item
                      {date.itemCount === 1 ? "" : "s"}
                    </small>
                  </span>

                  <span
                    className={`status-badge ${
                      date.isPublished === "Y"
                        ? "published"
                        : "unpublished"
                    }`}
                  >
                    {date.isPublished === "Y"
                      ? "PUBLISHED"
                      : "DRAFT"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">SELECTED DATE</span>

            <h2>{selectedDate}</h2>
          </div>

          <div className="section-actions">
            {selectedMenuDate && (
              <button
                type="button"
                className={
                  selectedMenuDate.isPublished === "Y"
                    ? "danger-button"
                    : "primary-button"
                }
                onClick={handlePublicationToggle}
              >
                {selectedMenuDate.isPublished === "Y"
                  ? "Unpublish Menu"
                  : "Publish Menu"}
              </button>
            )}
          </div>
        </div>

        {!selectedMenuDate && (
          <div className="admin-card admin-empty-card">
            Select an existing menu date or create a new one.
          </div>
        )}

        {selectedMenuDate && (
          <div className="admin-grid admin-grid-two">
            <form
              className="admin-card"
              onSubmit={handleCreateItem}
            >
              <h3>Add Menu Item</h3>

              <label>
                Item Name

                <input
                  type="text"
                  value={itemName}
                  onChange={(event) =>
                    setItemName(event.target.value)
                  }
                  placeholder="e.g. Chicken Biryani"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Description

                <textarea
                  value={itemDescription}
                  onChange={(event) =>
                    setItemDescription(event.target.value)
                  }
                  placeholder="Describe the menu item"
                  maxLength={500}
                  rows={3}
                />
              </label>

              <div className="admin-form-row">
                <label>
                  Price

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemPrice}
                    onChange={(event) =>
                      setItemPrice(event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Initial Stock

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={itemStock}
                    onChange={(event) =>
                      setItemStock(event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <label>
                Availability

                <select
                  value={itemAvailable}
                  onChange={(event) =>
                    setItemAvailable(event.target.value)
                  }
                >
                  <option value="Y">Available</option>
                  <option value="N">Unavailable</option>
                </select>
              </label>

              <div className="ingredient-selector">
                <span className="field-label">
                  Ingredients
                </span>

                {ingredients.length === 0 && (
                  <p className="admin-empty">
                    No ingredients in the catalog.
                  </p>
                )}

                <div className="ingredient-list">
                  {ingredients.map((ingredient) => (
                    <label
                      className="ingredient-option"
                      key={ingredient.ingredientId}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIngredients.includes(
                          ingredient.ingredientId,
                        )}
                        onChange={() =>
                          toggleIngredient(
                            ingredient.ingredientId,
                          )
                        }
                      />

                      <span>
                        {ingredient.ingredientName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={menuLoading}
              >
                Add Menu Item
              </button>
            </form>

            <form
              className="admin-card"
              onSubmit={handleCreateIngredient}
            >
              <h3>Ingredient Catalog</h3>

              <p className="admin-card-description">
                Create reusable ingredients that can be assigned
                to menu items.
              </p>

              <label>
                New Ingredient

                <input
                  type="text"
                  value={newIngredient}
                  onChange={(event) =>
                    setNewIngredient(event.target.value)
                  }
                  placeholder="e.g. Garlic"
                  maxLength={100}
                />
              </label>

              <button
                type="submit"
                className="secondary-button"
                disabled={!newIngredient.trim()}
              >
                Add Ingredient
              </button>

              <div className="ingredient-catalog">
                {ingredients.map((ingredient) => (
                  <span
                    className="ingredient-chip"
                    key={ingredient.ingredientId}
                  >
                    {ingredient.ingredientName}
                  </span>
                ))}
              </div>
            </form>
          </div>
        )}
      </section>

      {selectedMenuDate && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PICKUP OPERATIONS</span>

              <h2>Pickup Windows</h2>
            </div>

            <div className="pickup-window-summary">
              {pickupWindows.length} window
              {pickupWindows.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="admin-grid admin-grid-two">
            <form
              className="admin-card"
              onSubmit={handleCreatePickupWindow}
            >
              <h3>Create Pickup Window</h3>

              <p className="admin-card-description">
                Configure the time range and maximum number of orders that can
                be reserved for this date.
              </p>

              <div className="admin-form-row">
                <label>
                  Start Time

                  <input
                    type="time"
                    value={pickupStartTime}
                    onChange={(event) =>
                      setPickupStartTime(event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  End Time

                  <input
                    type="time"
                    value={pickupEndTime}
                    onChange={(event) =>
                      setPickupEndTime(event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <label>
                Capacity

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pickupCapacity}
                  onChange={(event) =>
                    setPickupCapacity(event.target.value)
                  }
                  required
                />
              </label>

              <button
                type="submit"
                className="primary-button"
                disabled={menuLoading}
              >
                Create Pickup Window
              </button>
            </form>

            <div className="admin-card">
              <h3>Existing Pickup Windows</h3>

              <p className="admin-card-description">
                Reserved capacity cannot be reduced below the number of
                existing reservations, and windows cannot overlap.
              </p>

              {pickupWindows.length === 0 ? (
                <p className="admin-empty">
                  No pickup windows have been configured for this date.
                </p>
              ) : (
                <div className="report-table pickup-window-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Start</th>
                        <th>End</th>
                        <th>Capacity</th>
                        <th>Reserved</th>
                        <th>Remaining</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pickupWindows.map((window) => {
                        const isEditing =
                          editingPickupWindowId ===
                          window.pickupWindowId;

                        return (
                          <tr key={window.pickupWindowId}>
                            <td>
                              {isEditing ? (
                                <input
                                  className="compact-input time-input"
                                  type="time"
                                  value={editPickupStartTime}
                                  onChange={(event) =>
                                    setEditPickupStartTime(
                                      event.target.value,
                                    )
                                  }
                                />
                              ) : (
                                window.startTime
                              )}
                            </td>

                            <td>
                              {isEditing ? (
                                <input
                                  className="compact-input time-input"
                                  type="time"
                                  value={editPickupEndTime}
                                  onChange={(event) =>
                                    setEditPickupEndTime(
                                      event.target.value,
                                    )
                                  }
                                />
                              ) : (
                                window.endTime
                              )}
                            </td>

                            <td>
                              {isEditing ? (
                                <input
                                  className="compact-input"
                                  type="number"
                                  min={window.reservedCount}
                                  step="1"
                                  value={editPickupCapacity}
                                  onChange={(event) =>
                                    setEditPickupCapacity(
                                      event.target.value,
                                    )
                                  }
                                />
                              ) : (
                                window.capacity
                              )}
                            </td>

                            <td>{window.reservedCount}</td>

                            <td>
                              <span
                                className={`capacity-badge ${
                                  window.availableCapacity === 0
                                    ? "full"
                                    : "open"
                                }`}
                              >
                                {window.availableCapacity}
                              </span>
                            </td>

                            <td>
                              {isEditing ? (
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className="primary-button compact-button"
                                    onClick={handleSavePickupWindow}
                                  >
                                    Save
                                  </button>

                                  <button
                                    type="button"
                                    className="secondary-button compact-button"
                                    onClick={cancelEditPickupWindow}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className="secondary-button compact-button"
                                    onClick={() =>
                                      beginEditPickupWindow(
                                        window.pickupWindowId,
                                        window.startTime,
                                        window.endTime,
                                        Number(window.capacity),
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="danger-button compact-button"
                                    disabled={window.reservedCount > 0}
                                    title={
                                      window.reservedCount > 0
                                        ? "Cannot delete a window with reserved orders"
                                        : "Delete pickup window"
                                    }
                                    onClick={() =>
                                      handleDeletePickupWindow(
                                        window.pickupWindowId,
                                        window.startTime,
                                        window.endTime,
                                        Number(window.reservedCount),
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">MENU CONTENT</span>

            <h2>Current Menu Items</h2>
          </div>
        </div>

        <div className="report-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Availability</th>
                <th>Ingredients</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!adminMenu || adminMenu.items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No menu items have been added for this date.
                  </td>
                </tr>
              ) : (
                adminMenu.items.map((item) => {
                  const isEditing =
                    editingItemId === item.menuItemId;

                  return (
                    <tr key={item.menuItemId}>
                      <td>
                        {isEditing ? (
                          <div className="table-edit-fields">
                            <input
                              value={editName}
                              onChange={(event) =>
                                setEditName(
                                  event.target.value,
                                )
                              }
                            />

                            <textarea
                              value={editDescription}
                              onChange={(event) =>
                                setEditDescription(
                                  event.target.value,
                                )
                              }
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div className="menu-item-cell">
                            <strong>
                              {item.itemName}
                            </strong>

                            <small>
                              {item.description ||
                                "No description"}
                            </small>
                          </div>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="compact-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editPrice}
                            onChange={(event) =>
                              setEditPrice(
                                event.target.value,
                              )
                            }
                          />
                        ) : (
                          `₹${Number(item.price).toFixed(2)}`
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="compact-input"
                            type="number"
                            min="0"
                            step="1"
                            value={editStock}
                            onChange={(event) =>
                              setEditStock(
                                event.target.value,
                              )
                            }
                          />
                        ) : (
                          item.stockQuantity ?? 0
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            value={editAvailable}
                            onChange={(event) =>
                              setEditAvailable(
                                event.target.value,
                              )
                            }
                          >
                            <option value="Y">
                              Available
                            </option>

                            <option value="N">
                              Unavailable
                            </option>
                          </select>
                        ) : (
                          <span
                            className={`status-badge ${
                              item.isAvailable === "Y"
                                ? "available"
                                : "unavailable"
                            }`}
                          >
                            {item.isAvailable === "Y"
                              ? "AVAILABLE"
                              : "UNAVAILABLE"}
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="ingredient-cell">
                          {(item.ingredients ?? []).length >
                          0
                            ? item.ingredients?.join(", ")
                            : "None assigned"}
                        </div>
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="primary-button compact-button"
                              onClick={handleSaveItem}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              className="secondary-button compact-button"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="secondary-button compact-button"
                              onClick={() =>
                                beginEdit(
                                  item.menuItemId,
                                  item.itemName,
                                  item.description ?? "",
                                  Number(item.price),
                                  item.isAvailable,
                                  Number(
                                    item.stockQuantity ?? 0,
                                  ),
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="danger-button compact-button"
                              onClick={() =>
                                handleDeleteItem(
                                  item.menuItemId,
                                  item.itemName,
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Reports token={token} />
      <StaffManagement session={session} />
    </div>
  );
}