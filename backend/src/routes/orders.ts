import { Router } from "express";
import { pool } from "../db.js";
import {
  authenticateToken,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

interface OrderItem {
  menuItemId: number;
  quantity: number;
}

router.post("/", authenticateToken, requireRole("STUDENT"), async (req: AuthenticatedRequest, res) => {
  let connection;
  try {
    const body = req.body as { pickupWindowId: number; items: OrderItem[] };
    const userId = req.user!.userId;

    if (!Number.isInteger(body.pickupWindowId) || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: "pickupWindowId and at least one item are required." });
    }

    for (const item of body.items) {
      if (!Number.isInteger(item.menuItemId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: "Each item must have a valid menuItemId and positive quantity." });
      }
    }

    connection = await pool.getConnection();

    const pickup = await connection.execute(
      `SELECT pickup_window_id, window_date, capacity, reserved_count
       FROM pickup_windows WHERE pickup_window_id = :pickup_window_id FOR UPDATE`,
      { pickup_window_id: body.pickupWindowId },
      { outFormat: 4002 },
    );

    const pw = pickup.rows[0] as any;
    if (!pw) return res.status(404).json({ error: "Pickup window not found." });
    if (Number(pw.reserved_count) >= Number(pw.capacity)) {
      return res.status(409).json({ error: "Pickup window is full." });
    }

    const ids = body.items.map((i) => i.menuItemId);
    const placeholders = ids.map((_, i) => `:id${i}`).join(",");
    const itemResult = await connection.execute(
      `SELECT mi.menu_item_id, mi.price, mi.is_available, md.menu_date,
              COALESCE(s.available_qty,0) AS available_qty
       FROM menu_items mi
       JOIN menu_dates md ON md.menu_date_id = mi.menu_date_id
       LEFT JOIN stock s ON s.menu_item_id = mi.menu_item_id
       WHERE mi.menu_item_id IN (${placeholders})
       FOR UPDATE OF mi`,
      Object.fromEntries(ids.map((id, i) => [`id${i}`, id])),
      { outFormat: 4002 },
    );

    const itemRows = itemResult.rows as any[];

    if (itemRows.length !== ids.length) {
      return res.status(400).json({ error: "One or more menu items do not exist." });
    }

    const byId = new Map(itemRows.map((r) => [Number(r.menu_item_id), r]));
    let total = 0;

    for (const item of body.items) {
      const row = byId.get(item.menuItemId);

      if (!row || row.is_available !== "Y") {
        return res.status(400).json({ error: "A selected menu item is unavailable." });
      }

      if (String(row.menu_date) !== String(pw.window_date)) {
        return res.status(400).json({ error: "Menu item does not belong to the pickup date." });
      }

      if (Number(row.available_qty) < item.quantity) {
        return res.status(409).json({
          error: `Insufficient stock for menu item ${item.menuItemId}.`,
        });
      }

      total += Number(row.price) * item.quantity;
    }

    const pickupCode = `CC${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

    const orderResult = await connection.execute(
      `INSERT INTO orders(user_id, pickup_window_id, pickup_code, order_status, total_amount)
       VALUES (:user_id, :pickup_window_id, :pickup_code, 'PLACED', :total_amount)
       RETURNING order_id INTO :order_id`,
      {
        user_id: userId,
        pickup_window_id: body.pickupWindowId,
        pickup_code: pickupCode,
        total_amount: total,
        order_id: { dir: "out" },
      },
      { outFormat: 4002 },
    );

    const orderId = Number(
      orderResult.outBinds?.order_id ?? orderResult.rows[0]?.order_id
    );

    if (!orderId) {
      throw new Error("Failed to create order.");
    }

    for (const item of body.items) {
      const row = byId.get(item.menuItemId);

      await connection.execute(
        `INSERT INTO order_lines(order_id, menu_item_id, quantity, unit_price)
         VALUES (:order_id, :menu_item_id, :quantity, :unit_price)`,
        {
          order_id: orderId,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          unit_price: Number(row.price),
        },
      );

      await connection.execute(
        `UPDATE stock
         SET available_qty = available_qty - :quantity
         WHERE menu_item_id = :menu_item_id`,
        {
          quantity: item.quantity,
          menu_item_id: item.menuItemId,
        },
      );
    }

    await connection.execute(
      `UPDATE pickup_windows
       SET reserved_count = reserved_count + 1
       WHERE pickup_window_id = :pickup_window_id`,
      {
        pickup_window_id: body.pickupWindowId,
      },
    );

    await connection.commit();

    return res.status(201).json({
      orderId,
      pickupCode,
      totalAmount: total,
    });
  } catch (error) {
    await connection?.rollback();

    console.error("Order API error:", error);

    return res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to place order.",
    });
  } finally {
    await connection?.close();
  }
});


router.get(
  "/history",
  authenticateToken,
  requireRole("STUDENT"),
  async (req: AuthenticatedRequest, res) => {
    let connection;

    try {
      connection = await pool.getConnection();

      const result = await connection.execute(
        `SELECT o.order_id,
                o.pickup_code,
                o.order_status,
                o.total_amount,
                o.ordered_at,
                TO_CHAR(pw.start_time, 'HH24:MI') AS start_time,
                TO_CHAR(pw.end_time, 'HH24:MI') AS end_time
         FROM orders o
         JOIN pickup_windows pw
           ON pw.pickup_window_id = o.pickup_window_id
         WHERE o.user_id = CAST(:user_id AS INTEGER)
         ORDER BY o.ordered_at DESC`,
        {
          user_id: req.user!.userId,
        },
      );

      const orders = (result.rows as any[]).map((r) => ({
        orderId: r[0],
        pickupCode: r[1],
        orderStatus: r[2],
        totalAmount: r[3],
        orderedAt: r[4],
        startTime: r[5],
        endTime: r[6],
      }));

      return res.json({
        userId: req.user!.userId,
        orders,
      });
    } catch (error) {
      console.error("Order history API error:", error);

      return res.status(500).json({
        error: "Unable to retrieve order history.",
      });
    } finally {
      await connection?.close();
    }
  }
);


router.post(
  "/:orderId/cancel",
  authenticateToken,
  requireRole("STUDENT"),
  async (req: AuthenticatedRequest, res) => {
    let connection;

    try {
      const orderId = Number(req.params.orderId);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Invalid order ID." });
      }

      connection = await pool.getConnection();

      const result = await connection.execute(
        `SELECT order_id, order_status, pickup_window_id
         FROM orders
         WHERE order_id = :order_id
           AND user_id = :user_id
         FOR UPDATE`,
        {
          order_id: orderId,
          user_id: req.user!.userId,
        },
        { outFormat: 4002 },
      );

      const order = result.rows[0] as any;

      if (!order) {
        return res.status(404).json({ error: "Order not found." });
      }

      if (!["PLACED", "PREPARING"].includes(order.order_status)) {
        return res.status(400).json({
          error: "This order can no longer be cancelled.",
        });
      }

      await connection.execute(
        `UPDATE orders
         SET order_status = 'CANCELLED',
             cancelled_at = CURRENT_TIMESTAMP
         WHERE order_id = :order_id`,
        {
          order_id: orderId,
        },
      );

      await connection.execute(
        `UPDATE pickup_windows
         SET reserved_count = GREATEST(0, reserved_count - 1)
         WHERE pickup_window_id = :pickup_window_id`,
        {
          pickup_window_id: order.pickup_window_id,
        },
      );

      await connection.execute(
        `UPDATE stock s
         SET available_qty = s.available_qty + ol.quantity
         FROM order_lines ol
         WHERE ol.order_id = :order_id
           AND s.menu_item_id = ol.menu_item_id`,
        {
          order_id: orderId,
        },
      );

      await connection.commit();

      return res.json({
        orderId,
        status: "CANCELLED",
      });
    } catch (error) {
      await connection?.rollback();

      console.error("Cancel order API error:", error);

      return res.status(400).json({
        error: error instanceof Error
          ? error.message
          : "Failed to cancel order.",
      });
    } finally {
      await connection?.close();
    }
  }
);


router.get(
  "/queue",
  authenticateToken,
  requireRole("STAFF", "ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const pickupWindowId = Number(req.query.pickupWindowId);

      if (!Number.isInteger(pickupWindowId) || pickupWindowId <= 0) {
        return res.status(400).json({
          error: "Invalid pickup window ID.",
        });
      }

      connection = await pool.getConnection();

      const result = await connection.execute(
        `SELECT o.order_id,
                u.full_name,
                o.pickup_code,
                TO_CHAR(pw.start_time, 'HH24:MI'),
                TO_CHAR(pw.end_time, 'HH24:MI'),
                o.order_status,
                o.total_amount,
                o.ordered_at
         FROM orders o
         JOIN users u
           ON u.user_id = o.user_id
         JOIN pickup_windows pw
           ON pw.pickup_window_id = o.pickup_window_id
         WHERE o.pickup_window_id = :pickup_window_id
         ORDER BY CASE o.order_status
                    WHEN 'PLACED' THEN 1
                    WHEN 'PREPARING' THEN 2
                    WHEN 'READY' THEN 3
                    ELSE 4
                  END,
                  o.ordered_at`,
        {
          pickup_window_id: pickupWindowId,
        },
      );

      const queue = (result.rows as any[]).map((r) => ({
        orderId: r[0],
        fullName: r[1],
        pickupCode: r[2],
        startTime: r[3],
        endTime: r[4],
        orderStatus: r[5],
        totalAmount: r[6],
        orderedAt: r[7],
      }));

      return res.json({
        pickupWindowId,
        queue,
      });
    } catch (error) {
      console.error("Pickup queue API error:", error);

      return res.status(400).json({
        error: error instanceof Error
          ? error.message
          : "Unable to retrieve pickup queue.",
      });
    } finally {
      await connection?.close();
    }
  }
);


router.patch(
  "/:orderId/status",
  authenticateToken,
  requireRole("STAFF", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    let connection;

    try {
      const orderId = Number(req.params.orderId);
      const status = req.body?.status;

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
          error: "Invalid order ID.",
        });
      }

      if (!["PREPARING", "READY", "COLLECTED"].includes(status)) {
        return res.status(400).json({
          error: "Invalid status.",
        });
      }

      connection = await pool.getConnection();

      await connection.execute(
        `SELECT order_id
         FROM orders
         WHERE order_id = :order_id
         FOR UPDATE`,
        {
          order_id: orderId,
        },
      );

      const current = await connection.execute(
        `SELECT order_status
         FROM orders
         WHERE order_id = :order_id`,
        {
          order_id: orderId,
        },
        { outFormat: 4002 },
      );

      const oldStatus = current.rows[0]?.order_status;

      if (!oldStatus) {
        return res.status(404).json({
          error: "Order not found.",
        });
      }

      const valid: Record<string, string[]> = {
        PREPARING: ["PLACED"],
        READY: ["PREPARING"],
        COLLECTED: ["READY"],
      };

      if (!valid[status].includes(oldStatus)) {
        return res.status(400).json({
          error: `Cannot change ${oldStatus} to ${status}.`,
        });
      }

      await connection.execute(
        `SELECT set_config('app.changed_by', :changed_by, true)`,
        {
          changed_by: String(req.user!.userId),
        },
      );

      await connection.execute(
        `UPDATE orders
         SET order_status = :status
         WHERE order_id = :order_id`,
        {
          status,
          order_id: orderId,
        },
      );

      await connection.commit();

      return res.json({
        orderId,
        status,
      });
    } catch (error) {
      await connection?.rollback();

      console.error("Update order status API error:", error);

      return res.status(400).json({
        error: error instanceof Error
          ? error.message
          : "Unable to update order status.",
      });
    } finally {
      await connection?.close();
    }
  }
);

export default router;
