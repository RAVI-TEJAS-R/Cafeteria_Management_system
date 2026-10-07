import type { OrderHistoryItem } from "../../types/order";

interface OrderCardProps {
  order: OrderHistoryItem;
  cancelling: boolean;
  onCancel: (orderId: number) => void;
}

function OrderCard({
  order,
  cancelling,
  onCancel,
}: OrderCardProps) {
  return (
    <div className="order-card" key={order.orderId}>
      <div>
        <h3>Order #{order.orderId}</h3>

        <p>
          Pickup code:{" "}
          <strong>{order.pickupCode}</strong>
        </p>

        <p>
          Pickup:{" "}
          <strong>
            {order.startTime} - {order.endTime}
          </strong>
        </p>

        <p>
          Ordered:{" "}
          {new Date(order.orderedAt).toLocaleString()}
        </p>
      </div>

      <div>
        <p>
          Total: <strong>₹{order.totalAmount}</strong>
        </p>

        <p>
          Status: <strong>{order.orderStatus}</strong>
        </p>

        {order.orderStatus === "PLACED" && (
          <button
            type="button"
            className="remove-button"
            onClick={() => onCancel(order.orderId)}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
      </div>
    </div>
  );
}

export default OrderCard;
