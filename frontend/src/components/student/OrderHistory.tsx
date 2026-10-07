import type { OrderHistoryItem } from "../../types/order";
import OrderCard from "./OrderCard";

interface OrderHistoryProps {
  orders: OrderHistoryItem[];
  loadingOrders: boolean;
  message: string;
  cancellingOrderId: number | null;
  onRefresh: () => void;
  onCancel: (orderId: number) => void;
}

const TRACKING_STEPS = [
  { key: "PLACED", label: "Order Placed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "COLLECTED", label: "Collected" },
] as const;

function normalizeStatus(status: string) {
  return status.trim().toUpperCase();
}

function getStatusIndex(status: string) {
  return TRACKING_STEPS.findIndex((step) => step.key === normalizeStatus(status));
}

function formatPickupTime(value: string) {
  if (!value) {
    return "--:--";
  }

  const timeMatch = value.match(/(\d{2}:\d{2})/);
  return timeMatch?.[1] ?? value;
}

function isActiveOrder(order: OrderHistoryItem) {
  const status = normalizeStatus(order.orderStatus);
  return status !== "COLLECTED" && status !== "CANCELLED";
}

function CurrentOrderTracking({ order }: { order: OrderHistoryItem }) {
  const status = normalizeStatus(order.orderStatus);
  const currentIndex = getStatusIndex(status);

  if (!isActiveOrder(order)) {
    return null;
  }

  return (
    <div className="current-order">
      <div className="current-order-header">
        <div>
          <span className="eyebrow">Live Status</span>
          <h3>Current Order</h3>
        </div>
        <span className="current-order-status">{status}</span>
      </div>

      <div className="current-order-summary">
        <div>
          <span>Order</span>
          <strong>#{order.orderId}</strong>
        </div>
        <div>
          <span>Pickup Code</span>
          <strong>{order.pickupCode}</strong>
        </div>
        <div>
          <span>Pickup Window</span>
          <strong>
            {formatPickupTime(order.startTime)} – {formatPickupTime(order.endTime)}
          </strong>
        </div>
      </div>

      {status === "CANCELLED" ? (
        <p className="tracking-note">This order has been cancelled.</p>
      ) : (
        <div className="order-tracking" aria-label={`Order status: ${status}`}>
          {TRACKING_STEPS.map((step, index) => {
            const completed = currentIndex >= 0 && index < currentIndex;
            const current = index === currentIndex;
            const stepClass = completed
              ? "completed"
              : current
                ? "current"
                : "";

            return (
              <div className={`tracking-step ${stepClass}`} key={step.key}>
                <div className="tracking-marker">
                  {completed || current ? "✓" : index + 1}
                </div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="tracking-note">
        Status refreshes automatically while this order is active.
      </p>
    </div>
  );
}

function OrderHistory({
  orders,
  loadingOrders,
  message,
  cancellingOrderId,
  onRefresh,
  onCancel,
}: OrderHistoryProps) {
  const currentOrder = orders.find(isActiveOrder);

  return (
    <section className="orders-section">
      <div className="section-header">
        <div>
          <span className="eyebrow">Account</span>
          <h2>My Orders</h2>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loadingOrders}
        >
          {loadingOrders ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && <p className="order-message">{message}</p>}

      {currentOrder && <CurrentOrderTracking order={currentOrder} />}

      {!loadingOrders && orders.length === 0 && (
        <p>No orders found.</p>
      )}

      <div className="orders-list">
        {orders.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            cancelling={cancellingOrderId === order.orderId}
            onCancel={onCancel}
          />
        ))}
      </div>
    </section>
  );
}

export default OrderHistory;
