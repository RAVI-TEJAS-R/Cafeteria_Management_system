import { useEffect, useState } from "react";
import type { Session } from "../../types/auth";
import type { QueueOrder } from "../../types/order";
import Header from "../common/Header";
import PickupQueue from "./PickupQueue";
import { useMenu } from "../../hooks/useMenu";
import { useOrders } from "../../hooks/useOrders";

interface StaffDashboardProps {
  session: Session;
  onLogout: () => void;
}

function StaffDashboard({
  session,
  onLogout,
}: StaffDashboardProps) {
  const {
    menu,
    menuLoading,
    message: menuMessage,
    loadMenu,
  } = useMenu(session.token);

  const {
    loadStaffQueue,
    updateOrderStatus,
  } = useOrders(session.token);

  const [staffPickupWindowId, setStaffPickupWindowId] =
    useState<number | null>(null);

  const [staffQueue, setStaffQueue] =
    useState<QueueOrder[]>([]);

  const [staffQueueLoading, setStaffQueueLoading] =
    useState(false);

  const [staffQueueMessage, setStaffQueueMessage] =
    useState("");

  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);

  useEffect(() => {
    loadMenu().catch((error) => {
      console.error("Menu loading error:", error);
    });
  }, [loadMenu]);

  async function loadQueue(
    pickupWindowId: number,
    showLoading = true,
  ) {
    if (showLoading) {
      setStaffQueueLoading(true);
    }

    setStaffQueueMessage("");

    try {
      const queue = await loadStaffQueue(pickupWindowId);
      setStaffQueue(queue);
    } catch (error) {
      console.error("Staff queue error:", error);

      setStaffQueueMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to the backend.",
      );

      setStaffQueue([]);
    } finally {
      if (showLoading) {
        setStaffQueueLoading(false);
      }
    }
  }

  async function handleSelectWindow(
    pickupWindowId: number,
  ) {
    setStaffPickupWindowId(pickupWindowId);
    await loadQueue(pickupWindowId);
  }

  async function handleUpdateOrderStatus(
    orderId: number,
    status: string,
  ) {
    setUpdatingOrderId(orderId);
    setStaffQueueMessage("");

    try {
      await updateOrderStatus(orderId, status);

      if (staffPickupWindowId !== null) {
        await loadQueue(staffPickupWindowId);
      }
    } catch (error) {
      console.error("Order status update error:", error);

      setStaffQueueMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to the backend.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  useEffect(() => {
    if (staffPickupWindowId === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadQueue(staffPickupWindowId, false).catch((error) => {
        console.error("Staff queue refresh error:", error);
      });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [staffPickupWindowId]);

  return (
    <main className="app-shell dashboard-shell">
      <Header
        fullName={session.fullName}
        role={session.role}
        subtitle="Staff Pickup Operations"
        onLogout={onLogout}
      />

      <section className="dashboard-content">
        <div className="dashboard-intro">
          <div>
            <span className="eyebrow">
              Staff Dashboard
            </span>

            <h2>Pickup Queue</h2>

            <p>
              Select a pickup window and manage orders
              through the cafeteria pickup workflow.
            </p>
          </div>

          <div className="date-card">
            <span>Today's date</span>

            <strong>
              {menu?.date ||
                new Date().toLocaleDateString("en-IN")}
            </strong>
          </div>
        </div>

        {menuLoading && (
          <div className="loading-card">
            Loading pickup windows...
          </div>
        )}

        {menuMessage && (
          <div className="message" role="alert">
            {menuMessage}
          </div>
        )}

        <PickupQueue
          pickupWindows={menu?.pickupWindows}
          selectedPickupWindowId={staffPickupWindowId}
          staffQueue={staffQueue}
          loading={staffQueueLoading}
          message={staffQueueMessage}
          updatingOrderId={updatingOrderId}
          onSelectWindow={handleSelectWindow}
          onRefresh={() =>
            staffPickupWindowId !== null &&
            loadQueue(staffPickupWindowId)
          }
          onUpdateStatus={handleUpdateOrderStatus}
        />
      </section>
    </main>
  );
}

export default StaffDashboard;
