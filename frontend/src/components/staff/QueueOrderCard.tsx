import type { QueueOrder } from "../../types/order";
import OrderStatusControl from "./OrderStatusControl";

interface QueueOrderCardProps {
  order: QueueOrder;
  nextStatus: string | null;
  updating: boolean;
  onUpdateStatus: (status: string) => void;
}

function QueueOrderCard({
  order,
  nextStatus,
  updating,
  onUpdateStatus,
}: QueueOrderCardProps) {
  const statusClass = order.orderStatus
    .toLowerCase()
    .replace(/_/g, "-");

  return (
    <article className="order-card staff-order-card">
      <div className="staff-order-main">
        <div className="staff-order-heading">
          <div>
            <span className="order-number-label">
              Pickup Order
            </span>
            <h3>Order #{order.orderId}</h3>
          </div>

          <span className={`staff-status ${statusClass}`}>
            {order.orderStatus}
          </span>
        </div>

        <p>
          Pickup code:{" "}
          <strong>{order.pickupCode}</strong>
        </p>

        <p>
          Ordered:{" "}
          {new Date(order.orderedAt).toLocaleString()}
        </p>
      </div>

      <div className="staff-order-actions">
        <p className="staff-order-total">
          Total: <strong>₹{order.totalAmount}</strong>
        </p>

        <p className="staff-current-status">
          Current status:{" "}
          <strong>{order.orderStatus}</strong>
        </p>

        <OrderStatusControl
          nextStatus={nextStatus}
          updating={updating}
          onUpdate={onUpdateStatus}
        />
      </div>
    </article>
  );
}

export default QueueOrderCard;
