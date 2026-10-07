import { useMemo } from "react";
import { useReports } from "../../hooks/useReports";
import type { OrderDetail } from "../../services/reportApi";

interface ReportsProps {
  token: string;
}

function money(value: number): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function numericValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function Reports({ token }: ReportsProps) {
  const {
    selectedDate,
    setSelectedDate,
    reports,
    loading,
    error,
    loadReports,
  } = useReports(token);

  const summary = useMemo(() => {
    const rows = reports.dailySummary;
    const exact = rows.find((row) => row.orderDate === selectedDate);

    if (exact) {
      return {
        orders: numericValue(exact.totalOrders),
        sales: numericValue(exact.totalSales),
        completed: numericValue(exact.completedOrders),
        cancelled: numericValue(exact.cancelledOrders),
      };
    }

    return rows.reduce(
      (result, row) => ({
        orders: result.orders + numericValue(row.totalOrders),
        sales: result.sales + numericValue(row.totalSales),
        completed: result.completed + numericValue(row.completedOrders),
        cancelled: result.cancelled + numericValue(row.cancelledOrders),
      }),
      { orders: 0, sales: 0, completed: 0, cancelled: 0 },
    );
  }, [reports.dailySummary, selectedDate]);

  const popularItems = useMemo(() => {
    const totals = new Map<string, number>();

    for (const row of reports.orderDetails) {
      if (!row.itemName) continue;
      totals.set(
        row.itemName,
        (totals.get(row.itemName) ?? 0) + numericValue(row.quantity),
      );
    }

    return [...totals.entries()]
      .map(([itemName, quantity]) => ({ itemName, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [reports.orderDetails]);

  const statusBreakdown = useMemo(() => {
    const orderStatuses = new Map<number, string>();

    for (const row of reports.orderDetails) {
      if (!orderStatuses.has(row.orderId)) {
        orderStatuses.set(row.orderId, row.orderStatus);
      }
    }

    const counts = new Map<string, number>();

    for (const status of orderStatuses.values()) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports.orderDetails]);

  const pickupWindows = useMemo(() => {
    const windows = new Map<
      string,
      {
        start: string;
        end: string;
        orderIds: Set<number>;
        collectedOrderIds: Set<number>;
      }
    >();

    for (const row of reports.orderDetails) {
      const start = row.startTime ?? "Unknown";
      const end = row.endTime ?? "";
      const key = `${start}|${end}`;

      const current = windows.get(key) ?? {
        start,
        end,
        orderIds: new Set<number>(),
        collectedOrderIds: new Set<number>(),
      };

      current.orderIds.add(row.orderId);

      if (row.orderStatus === "COLLECTED") {
        current.collectedOrderIds.add(row.orderId);
      }

      windows.set(key, current);
    }

    return [...windows.values()]
      .map((window) => ({
        start: window.start,
        end: window.end,
        orders: window.orderIds.size,
        collected: window.collectedOrderIds.size,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [reports.orderDetails]);

  const stockWarnings = useMemo(
    () =>
      reports.menuStock.filter(
        (item) => numericValue(item.stockQuantity) === 0 || item.isAvailable !== "Y",
      ),
    [reports.menuStock],
  );

  return (
    <section className="admin-section reports-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">REPORTING & ANALYTICS</span>
          <h2>Operations Overview</h2>
        </div>

        <div className="report-toolbar">
          <label className="report-date-control">
            Report Date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadReports(selectedDate)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Reports"}
          </button>
        </div>
      </div>

      {error && <div className="admin-message report-error">{error}</div>}

      <div className="report-metric-grid">
        <article className="report-metric-card">
          <span>Today's Orders</span>
          <strong>{summary.orders}</strong>
          <small>Orders recorded for {selectedDate}</small>
        </article>
        <article className="report-metric-card">
          <span>Today's Sales</span>
          <strong>{money(summary.sales)}</strong>
          <small>Total order value</small>
        </article>
        <article className="report-metric-card">
          <span>Completed Orders</span>
          <strong>{summary.completed}</strong>
          <small>Collected orders</small>
        </article>
        <article className="report-metric-card">
          <span>Cancelled Orders</span>
          <strong>{summary.cancelled}</strong>
          <small>Cancelled orders</small>
        </article>
      </div>

      <div className="admin-grid admin-grid-two reports-grid">
        <div className="admin-card">
          <div className="report-card-heading">
            <div>
              <span className="section-kicker">DEMAND</span>
              <h3>Popular Items</h3>
            </div>
          </div>

          {popularItems.length === 0 ? (
            <p className="admin-empty">No item sales data for this date.</p>
          ) : (
            <div className="report-ranking-list">
              {popularItems.map((item, index) => (
                <div className="report-ranking-row" key={item.itemName}>
                  <span className="report-rank">{index + 1}</span>
                  <span className="report-ranking-name">{item.itemName}</span>
                  <strong>{item.quantity}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card">
          <div className="report-card-heading">
            <div>
              <span className="section-kicker">WORKFLOW</span>
              <h3>Order Status</h3>
            </div>
          </div>

          {statusBreakdown.length === 0 ? (
            <p className="admin-empty">No order status data for this date.</p>
          ) : (
            <div className="report-status-list">
              {statusBreakdown.map(([status, count]) => (
                <div className="report-status-row" key={status}>
                  <span className={`report-status-badge ${status.toLowerCase()}`}>
                    {statusLabel(status)}
                  </span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-grid admin-grid-two reports-grid">
        <div className="admin-card">
          <div className="report-card-heading">
            <div>
              <span className="section-kicker">PICKUP OPERATIONS</span>
              <h3>Pickup Window Activity</h3>
            </div>
          </div>

          {pickupWindows.length === 0 ? (
            <p className="admin-empty">No pickup-window order activity.</p>
          ) : (
            <div className="report-table report-inner-table">
              <table>
                <thead>
                  <tr>
                    <th>Window</th>
                    <th>Orders</th>
                    <th>Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {pickupWindows.map((window) => (
                    <tr key={`${window.start}-${window.end}`}>
                      <td>{window.start} - {window.end}</td>
                      <td>{window.orders}</td>
                      <td>{window.collected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-card">
          <div className="report-card-heading">
            <div>
              <span className="section-kicker">INVENTORY</span>
              <h3>Stock Attention</h3>
            </div>
          </div>

          {stockWarnings.length === 0 ? (
            <p className="admin-empty">No unavailable or out-of-stock items.</p>
          ) : (
            <div className="report-stock-list">
              {stockWarnings.map((item) => (
                <div className="report-stock-row" key={`${item.menuItemId}-${item.itemName}`}>
                  <div>
                    <strong>{item.itemName}</strong>
                    <small>
                      {item.isAvailable === "Y" ? "Available flag enabled" : "Marked unavailable"}
                    </small>
                  </div>
                  <span className="capacity-badge full">
                    {numericValue(item.stockQuantity)} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card report-order-details-card">
        <div className="report-card-heading">
          <div>
            <span className="section-kicker">AUDIT DATA</span>
            <h3>Order Details</h3>
          </div>
          <span className="report-row-count">
            {reports.orderDetails.length} row{reports.orderDetails.length === 1 ? "" : "s"}
          </span>
        </div>

        {reports.orderDetails.length === 0 ? (
          <p className="admin-empty">No order details available for this date.</p>
        ) : (
          <div className="report-table report-inner-table">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Student</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Pickup</th>
                </tr>
              </thead>
              <tbody>
                {reports.orderDetails.slice(0, 100).map((row: OrderDetail, index) => (
                  <tr key={`${row.orderId}-${row.itemName ?? "item"}-${index}`}>
                    <td>#{row.orderId}</td>
                    <td>
                      <div className="report-person-cell">
                        <strong>{row.fullName ?? "—"}</strong>
                        <small>{row.email ?? ""}</small>
                      </div>
                    </td>
                    <td>{row.itemName ?? "—"}</td>
                    <td>{numericValue(row.quantity) || "—"}</td>
                    <td>
                      <span className={`report-status-badge ${row.orderStatus.toLowerCase()}`}>
                        {statusLabel(row.orderStatus)}
                      </span>
                    </td>
                    <td>{money(row.totalAmount)}</td>
                    <td>
                      {row.startTime && row.endTime
                        ? `${row.startTime} - ${row.endTime}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
