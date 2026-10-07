import type { PickupWindow } from "../../types/menu";
import type { QueueOrder } from "../../types/order";
import QueueOrderCard from "./QueueOrderCard";

interface PickupQueueProps {
  pickupWindows?: PickupWindow[];
  selectedPickupWindowId: number | null;
  staffQueue: QueueOrder[];
  loading: boolean;
  message: string;
  updatingOrderId: number | null;
  onSelectWindow: (pickupWindowId: number) => void;
  onRefresh: () => void;
  onUpdateStatus: (orderId: number, status: string) => void;
}

function getNextStatus(status: string) {
  if (status === "PLACED") return "PREPARING";
  if (status === "PREPARING") return "READY";
  if (status === "READY") return "COLLECTED";
  return null;
}

function PickupQueue({
  pickupWindows,
  selectedPickupWindowId,
  staffQueue,
  loading,
  message,
  updatingOrderId,
  onSelectWindow,
  onRefresh,
  onUpdateStatus,
}: PickupQueueProps) {
  const selectedWindow = pickupWindows?.find(
    (window) => window.pickupWindowId === selectedPickupWindowId,
  );

  const statusCounts = staffQueue.reduce(
    (counts, order) => {
      if (order.orderStatus === "PLACED") counts.placed += 1;
      if (order.orderStatus === "PREPARING") counts.preparing += 1;
      if (order.orderStatus === "READY") counts.ready += 1;
      return counts;
    },
    { placed: 0, preparing: 0, ready: 0 },
  );

  return (
    <>
      <section className="pickup-window-section">
        <div className="staff-section-heading">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Select Pickup Window</h2>
          </div>
        </div>

        {pickupWindows?.length === 0 && (
          <p>No pickup windows available.</p>
        )}

        <div className="pickup-window-list">
          {pickupWindows?.map((window) => (
            <button
              key={window.pickupWindowId}
              type="button"
              onClick={() => onSelectWindow(window.pickupWindowId)}
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
                {window.reservedCount} reserved /{" "}
                {window.capacity} capacity
              </span>
              <span>
                {window.availableCapacity} available
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="orders-section staff-queue-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h2>Pickup Queue</h2>
            {selectedWindow && (
              <p>
                {selectedWindow.startTime} -{" "}
                {selectedWindow.endTime}
              </p>
            )}
          </div>

          {selectedPickupWindowId !== null && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Queue"}
            </button>
          )}
        </div>

        {selectedPickupWindowId !== null &&
          !loading &&
          staffQueue.length > 0 && (
            <div className="queue-summary">
              <div>
                <span>Placed</span>
                <strong>{statusCounts.placed}</strong>
              </div>
              <div>
                <span>Preparing</span>
                <strong>{statusCounts.preparing}</strong>
              </div>
              <div>
                <span>Ready</span>
                <strong>{statusCounts.ready}</strong>
              </div>
              <div>
                <span>Active</span>
                <strong>{staffQueue.length}</strong>
              </div>
            </div>
          )}

        {message && (
          <p className="order-message" role="alert">
            {message}
          </p>
        )}

        {selectedPickupWindowId === null && (
          <div className="empty-card">
            <h3>Select a pickup window</h3>
            <p>
              Choose a pickup window above to view and process
              its active orders.
            </p>
          </div>
        )}

        {selectedPickupWindowId !== null && loading && (
          <div className="loading-card">
            Loading pickup queue...
          </div>
        )}

        {selectedPickupWindowId !== null &&
          !loading &&
          staffQueue.length === 0 && (
            <div className="empty-card">
              <h3>No active orders</h3>
              <p>
                There are currently no active orders for the
                selected pickup window.
              </p>
            </div>
          )}

        {!loading && staffQueue.length > 0 && (
          <div className="orders-list">
            {staffQueue.map((order) => {
              const nextStatus = getNextStatus(order.orderStatus);

              return (
                <QueueOrderCard
                  key={order.orderId}
                  order={order}
                  nextStatus={nextStatus}
                  updating={updatingOrderId === order.orderId}
                  onUpdateStatus={(status) =>
                    onUpdateStatus(order.orderId, status)
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default PickupQueue;
