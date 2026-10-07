interface OrderStatusControlProps {
  nextStatus: string | null;
  updating: boolean;
  onUpdate: (status: string) => void;
}

function getStatusActionLabel(nextStatus: string) {
  if (nextStatus === "PREPARING") {
    return "Start Preparing";
  }

  if (nextStatus === "READY") {
    return "Mark Ready";
  }

  if (nextStatus === "COLLECTED") {
    return "Mark Collected";
  }

  return `Mark ${nextStatus}`;
}

function OrderStatusControl({
  nextStatus,
  updating,
  onUpdate,
}: OrderStatusControlProps) {
  if (!nextStatus) {
    return null;
  }

  return (
    <button
      type="button"
      className="primary-button status-action-button"
      onClick={() => onUpdate(nextStatus)}
      disabled={updating}
    >
      {updating
        ? "Updating..."
        : getStatusActionLabel(nextStatus)}
    </button>
  );
}

export default OrderStatusControl;
