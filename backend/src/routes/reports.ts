import { Router } from "express";
import { pool } from "../db.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

function isValidReportDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function executeReport(
  sql: string,
  binds: Record<string, string>,
) {
  let connection;

  try {
    connection = await pool.getConnection();

    const result = await connection.execute(sql, binds, {
      outFormat: 4002,
    });

    return result.rows ?? [];
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

router.get(
  "/daily-order-summary",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    const date = req.query.date;

    if (!isValidReportDate(date)) {
      return res.status(400).json({
        error: "A valid report date in YYYY-MM-DD format is required.",
      });
    }

    try {
      const rows = await executeReport(
        `
          SELECT
              TO_CHAR(TRUNC(o.ordered_at), 'YYYY-MM-DD') AS "orderDate",
              COUNT(*) AS "totalOrders",
              NVL(
                SUM(
                  CASE
                    WHEN o.order_status <> 'CANCELLED'
                    THEN o.total_amount
                    ELSE 0
                  END
                ),
                0
              ) AS "totalSales",
              SUM(
                CASE
                  WHEN o.order_status = 'COLLECTED'
                  THEN 1
                  ELSE 0
                END
              ) AS "completedOrders",
              SUM(
                CASE
                  WHEN o.order_status = 'CANCELLED'
                  THEN 1
                  ELSE 0
                END
              ) AS "cancelledOrders"
          FROM orders o
          WHERE TRUNC(o.ordered_at) = TO_DATE(:reportDate, 'YYYY-MM-DD')
          GROUP BY TRUNC(o.ordered_at)
        `,
        { reportDate: date },
      );

      return res.json(rows);
    } catch (error) {
      console.error("Daily order summary report error:", error);

      return res.status(500).json({
        error: "Failed to load the daily order summary.",
      });
    }
  },
);

router.get(
  "/menu-stock-status",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    const date = req.query.date;

    if (!isValidReportDate(date)) {
      return res.status(400).json({
        error: "A valid report date in YYYY-MM-DD format is required.",
      });
    }

    try {
      const rows = await executeReport(
        `
          SELECT
              TO_CHAR(md.menu_date, 'YYYY-MM-DD') AS "menuDate",
              mi.menu_item_id AS "menuItemId",
              mi.item_name AS "itemName",
              NVL(s.available_qty, 0) AS "stockQuantity",
              mi.is_available AS "isAvailable"
          FROM menu_dates md
          JOIN menu_items mi
            ON mi.menu_date_id = md.menu_date_id
          LEFT JOIN stock s
            ON s.menu_item_id = mi.menu_item_id
          WHERE md.menu_date = TO_DATE(:reportDate, 'YYYY-MM-DD')
          ORDER BY mi.menu_item_id
        `,
        { reportDate: date },
      );

      return res.json(rows);
    } catch (error) {
      console.error("Menu stock status report error:", error);

      return res.status(500).json({
        error: "Failed to load menu stock status.",
      });
    }
  },
);

router.get(
  "/order-details",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    const date = req.query.date;

    if (!isValidReportDate(date)) {
      return res.status(400).json({
        error: "A valid report date in YYYY-MM-DD format is required.",
      });
    }

    try {
      /*
       * One row per order line.
       *
       * This lets the Admin Reports UI show both audit-level order
       * information and the actual menu item / quantity sold.
       */
      const rows = await executeReport(
        `
          SELECT
              o.order_id AS "orderId",
              u.full_name AS "fullName",
              u.email AS "email",
              o.pickup_code AS "pickupCode",
              o.order_status AS "orderStatus",
              o.total_amount AS "totalAmount",
              TO_CHAR(pw.start_time, 'HH24:MI') AS "startTime",
              TO_CHAR(pw.end_time, 'HH24:MI') AS "endTime",
              o.ordered_at AS "orderedAt",
              o.cancelled_at AS "cancelledAt",
              mi.item_name AS "itemName",
              ol.quantity AS "quantity",
              ol.unit_price AS "unitPrice"
          FROM orders o
          JOIN users u
            ON u.user_id = o.user_id
          JOIN pickup_windows pw
            ON pw.pickup_window_id = o.pickup_window_id
          JOIN order_lines ol
            ON ol.order_id = o.order_id
          JOIN menu_items mi
            ON mi.menu_item_id = ol.menu_item_id
          WHERE TRUNC(o.ordered_at) = TO_DATE(:reportDate, 'YYYY-MM-DD')
          ORDER BY o.order_id DESC, mi.item_name
        `,
        { reportDate: date },
      );

      return res.json(rows);
    } catch (error) {
      console.error("Order details report error:", error);

      return res.status(500).json({
        error: "Failed to load order details.",
      });
    }
  },
);

/*
 * Existing consolidated reporting endpoint.
 * Kept intact as a general DBMS-reporting endpoint while the three
 * date-specific endpoints above serve the Admin dashboard.
 */
router.get(
  "/",
  authenticateToken,
  requireRole("ADMIN"),
  async (_req, res) => {
    let connection;

    try {
      connection = await pool.getConnection();

      const reports: Record<string, unknown[]> = {};

      const queries: Record<string, string> = {
        orderDetails: `
          SELECT
              o.order_id AS "orderId",
              u.full_name AS "studentName",
              o.pickup_code AS "pickupCode",
              o.order_status AS "orderStatus",
              o.total_amount AS "totalAmount",
              o.ordered_at AS "orderedAt",
              pw.start_time AS "pickupStart",
              pw.end_time AS "pickupEnd"
          FROM orders o
          JOIN users u
            ON u.user_id = o.user_id
          JOIN pickup_windows pw
            ON pw.pickup_window_id = o.pickup_window_id
          ORDER BY o.order_id
        `,

        orderCountByStatus: `
          SELECT
              order_status AS "orderStatus",
              COUNT(*) AS "orderCount"
          FROM orders
          GROUP BY order_status
          ORDER BY order_status
        `,

        revenueByPickupWindow: `
          SELECT
              pw.pickup_window_id AS "pickupWindowId",
              pw.start_time AS "pickupStart",
              pw.end_time AS "pickupEnd",
              COUNT(o.order_id) AS "orderCount",
              NVL(
                SUM(
                  CASE
                    WHEN o.order_status <> 'CANCELLED'
                    THEN o.total_amount
                    ELSE 0
                  END
                ),
                0
              ) AS "netRevenue"
          FROM pickup_windows pw
          LEFT JOIN orders o
            ON o.pickup_window_id = pw.pickup_window_id
          GROUP BY
              pw.pickup_window_id,
              pw.start_time,
              pw.end_time
          ORDER BY pw.pickup_window_id
        `,

        topSellingMenuItems: `
          SELECT
              mi.menu_item_id AS "menuItemId",
              mi.item_name AS "menuItem",
              SUM(ol.quantity) AS "quantitySold"
          FROM order_lines ol
          JOIN orders o
            ON o.order_id = ol.order_id
          JOIN menu_items mi
            ON mi.menu_item_id = ol.menu_item_id
          WHERE o.order_status <> 'CANCELLED'
          GROUP BY
              mi.menu_item_id,
              mi.item_name
          ORDER BY "quantitySold" DESC
        `,

        itemsAboveAveragePrice: `
          SELECT
              menu_item_id AS "menuItemId",
              item_name AS "menuItem",
              price AS "price"
          FROM menu_items
          WHERE price > (
            SELECT AVG(price)
            FROM menu_items
          )
          ORDER BY price DESC
        `,

        studentsWithOrders: `
          SELECT
              u.user_id AS "userId",
              u.full_name AS "studentName",
              u.email AS "email"
          FROM users u
          JOIN roles r
            ON r.role_id = u.role_id
          WHERE r.role_name = 'STUDENT'
            AND EXISTS (
              SELECT 1
              FROM orders o
              WHERE o.user_id = u.user_id
            )
          ORDER BY u.user_id
        `,

        menuItemsWithIngredients: `
          SELECT
              mi.item_name AS "menuItem",
              i.ingredient_name AS "ingredient"
          FROM menu_items mi
          JOIN item_ingredients ii
            ON ii.menu_item_id = mi.menu_item_id
          JOIN ingredients i
            ON i.ingredient_id = ii.ingredient_id
          ORDER BY
              mi.item_name,
              i.ingredient_name
        `,

        stockReport: `
          SELECT
              mi.menu_item_id AS "menuItemId",
              mi.item_name AS "menuItem",
              s.available_qty AS "availableQuantity",
              mi.is_available AS "available"
          FROM stock s
          JOIN menu_items mi
            ON mi.menu_item_id = s.menu_item_id
          ORDER BY s.available_qty ASC, mi.item_name
        `,

        pickupWindowUtilization: `
          SELECT
              pw.pickup_window_id AS "pickupWindowId",
              pw.start_time AS "pickupStart",
              pw.end_time AS "pickupEnd",
              pw.capacity AS "capacity",
              pw.reserved_count AS "reserved",
              pw.capacity - pw.reserved_count AS "available",
              ROUND(
                (pw.reserved_count::numeric / NULLIF(pw.capacity, 0)) * 100,
                2
              ) AS "utilization"
          FROM pickup_windows pw
          ORDER BY pw.pickup_window_id
        `,

        studentOrderSummary: `
          SELECT
              u.user_id AS "userId",
              u.full_name AS "studentName",
              COUNT(o.order_id) AS "totalOrders",
              NVL(
                SUM(
                  CASE
                    WHEN o.order_status <> 'CANCELLED'
                    THEN o.total_amount
                    ELSE 0
                  END
                ),
                0
              ) AS "netSpending"
          FROM users u
          JOIN roles r
            ON r.role_id = u.role_id
          LEFT JOIN orders o
            ON o.user_id = u.user_id
          WHERE r.role_name = 'STUDENT'
          GROUP BY
              u.user_id,
              u.full_name
          ORDER BY u.user_id
        `,
      };

      for (const [name, sql] of Object.entries(queries)) {
        const result = await connection.execute(sql, {}, {
          outFormat: 4002,
        });

        reports[name] = result.rows ?? [];
      }

      return res.json({ reports });
    } catch (error) {
      console.error("Reports API error:", error);

      return res.status(500).json({
        error: "Failed to generate reports.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

export default router;
