import type { PickupWindow } from "../../types/menu";

interface PickupWindowSelectorProps {
  pickupWindows?: PickupWindow[];
  selectedPickupWindowId: number | null;
  onSelect: (pickupWindowId: number) => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
  cartLength: number;
  orderMessage: string;
}

function PickupWindowSelector({
  pickupWindows,
  selectedPickupWindowId,
  onSelect,
  onPlaceOrder,
  isPlacingOrder,
  cartLength,
  orderMessage,
}: PickupWindowSelectorProps) {
  const selectedWindow = pickupWindows?.find(
    (window) => window.pickupWindowId === selectedPickupWindowId,
  );

  return (
    <section className="pickup-window-section">
      <h2>Choose Pickup Window</h2>

      {pickupWindows?.length === 0 && (
        <p>No pickup windows available.</p>
      )}

      <div className="pickup-window-list">
        {pickupWindows?.map((window) => (
          <button
            key={window.pickupWindowId}
            type="button"
            disabled={window.availableCapacity <= 0}
            onClick={() => onSelect(window.pickupWindowId)}
            className={
              selectedPickupWindowId === window.pickupWindowId
                ? "pickup-window selected"
                : "pickup-window"
            }
          >
            <strong>
              {window.startTime} - {window.endTime}
            </strong>

            <span>
              {window.availableCapacity} slots available
            </span>
          </button>
        ))}
      </div>

      {selectedPickupWindowId !== null && (
        <p>
          Selected pickup window:{" "}
          <strong>
            {selectedWindow?.startTime} - {selectedWindow?.endTime}
          </strong>
        </p>
      )}

      <button
        type="button"
        className="primary-button"
        onClick={onPlaceOrder}
        disabled={
          isPlacingOrder ||
          cartLength === 0 ||
          selectedPickupWindowId === null
        }
      >
        {isPlacingOrder ? "Placing Order..." : "Place Order"}
      </button>

      {orderMessage && (
        <p className="order-message">{orderMessage}</p>
      )}
    </section>
  );
}

export default PickupWindowSelector;
