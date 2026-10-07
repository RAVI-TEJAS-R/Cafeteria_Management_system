import express from "express";
import { Router } from "express";
import { pool } from "../db.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

interface MenuItemRow {
  menuItemId: number;
  itemName: string;
  description: string;
  price: number;
  isAvailable: string;
  stockQuantity?: number;
}

interface IngredientRow {
  menuItemId: number;
  ingredientName: string;
}

interface IngredientCatalogRow {
  ingredientId: number;
  ingredientName: string;
}

interface PickupWindowRow {
  pickupWindowId: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  availableCapacity: number;
}

interface AdminMenuDateRow {
  menuDateId: number;
  menuDate: string;
  isPublished: string;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/*
 * --------------------------------------------------------------------------
 * STUDENT / STAFF / ADMIN - PUBLISHED MENU
 * GET /api/menu?date=YYYY-MM-DD
 * --------------------------------------------------------------------------
 */
router.get(
  "/",
  authenticateToken,
  requireRole("STUDENT", "STAFF", "ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const date = String(req.query.date ?? "");

      if (!date || !isValidDate(date)) {
        return res.status(400).json({
          error: "date query parameter is required. Use YYYY-MM-DD.",
        });
      }

      connection = await pool.getConnection();

      const menuResult = await connection.execute<MenuItemRow>(
        `
        SELECT
            mi.menu_item_id AS "menuItemId",
            mi.item_name AS "itemName",
            mi.description AS "description",
            mi.price AS "price",
            mi.is_available AS "isAvailable",
            NVL(s.available_qty, 0) AS "stockQuantity"
        FROM menu_dates md
        JOIN menu_items mi
          ON mi.menu_date_id = md.menu_date_id
        LEFT JOIN stock s
          ON s.menu_item_id = mi.menu_item_id
        WHERE md.menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
          AND md.is_published = 'Y'
        ORDER BY mi.menu_item_id
        `,
        { menu_date: date },
        { outFormat: 4002 },
      );

      const ingredientResult = await connection.execute<IngredientRow>(
        `
        SELECT
            ii.menu_item_id AS "menuItemId",
            i.ingredient_name AS "ingredientName"
        FROM item_ingredients ii
        JOIN ingredients i
          ON i.ingredient_id = ii.ingredient_id
        JOIN menu_items mi
          ON mi.menu_item_id = ii.menu_item_id
        JOIN menu_dates md
          ON md.menu_date_id = mi.menu_date_id
        WHERE md.menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        ORDER BY ii.menu_item_id, i.ingredient_name
        `,
        { menu_date: date },
        { outFormat: 4002 },
      );

      const pickupResult = await connection.execute<PickupWindowRow>(
        `
        SELECT
            pickup_window_id AS "pickupWindowId",
            TO_CHAR(start_time, 'HH24:MI') AS "startTime",
            TO_CHAR(end_time, 'HH24:MI') AS "endTime",
            capacity AS "capacity",
            reserved_count AS "reservedCount",
            capacity - reserved_count AS "availableCapacity"
        FROM pickup_windows
        WHERE window_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        ORDER BY start_time
        `,
        { menu_date: date },
        { outFormat: 4002 },
      );

      const ingredientsByItem = new Map<number, string[]>();

      for (const ingredient of ingredientResult.rows ?? []) {
        if (!ingredientsByItem.has(ingredient.menuItemId)) {
          ingredientsByItem.set(ingredient.menuItemId, []);
        }

        ingredientsByItem
          .get(ingredient.menuItemId)!
          .push(ingredient.ingredientName);
      }

      const items = (menuResult.rows ?? []).map((item) => ({
        ...item,
        ingredients: ingredientsByItem.get(item.menuItemId) ?? [],
      }));

      return res.json({
        date,
        items,
        pickupWindows: pickupResult.rows ?? [],
      });
    } catch (error) {
      console.error("Menu API error:", error);

      return res.status(500).json({
        error: "Failed to retrieve menu.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - MENU DATES
 * GET /api/menu/admin/dates
 * --------------------------------------------------------------------------
 */
router.get(
  "/admin/dates",
  authenticateToken,
  requireRole("ADMIN"),
  async (_req, res) => {
    let connection;

    try {
      connection = await pool.getConnection();

      const result = await connection.execute(
        `
        SELECT
            md.menu_date_id AS "menuDateId",
            TO_CHAR(md.menu_date, 'YYYY-MM-DD') AS "menuDate",
            md.is_published AS "isPublished",
            COUNT(mi.menu_item_id) AS "itemCount"
        FROM menu_dates md
        LEFT JOIN menu_items mi
          ON mi.menu_date_id = md.menu_date_id
        GROUP BY
            md.menu_date_id,
            md.menu_date,
            md.is_published
        ORDER BY md.menu_date DESC
        `,
        {},
        { outFormat: 4002 },
      );

      return res.json({
        dates: result.rows ?? [],
      });
    } catch (error) {
      console.error("Admin menu dates error:", error);

      return res.status(500).json({
        error: "Failed to retrieve menu dates.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - CREATE MENU DATE
 * POST /api/menu/admin/dates
 * Body:
 * {
 *   "menuDate": "2026-10-06",
 *   "isPublished": "N"
 * }
 * --------------------------------------------------------------------------
 */
router.post(
  "/admin/dates",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuDate = String(req.body.menuDate ?? "");
      const isPublished = String(
        req.body.isPublished ?? "N",
      ).toUpperCase();

      if (!isValidDate(menuDate)) {
        return res.status(400).json({
          error: "menuDate must use YYYY-MM-DD format.",
        });
      }

      if (!["Y", "N"].includes(isPublished)) {
        return res.status(400).json({
          error: "isPublished must be Y or N.",
        });
      }

      connection = await pool.getConnection();

      const existing = await connection.execute(
        `
        SELECT menu_date_id
        FROM menu_dates
        WHERE menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        `,
        {
          menu_date: menuDate,
        },
        {
          outFormat: 4002,
        },
      );

      if ((existing.rows ?? []).length > 0) {
        return res.status(409).json({
          error: "A menu date already exists for this date.",
        });
      }

      await connection.execute(
        `
        INSERT INTO menu_dates (
          menu_date,
          is_published
        )
        VALUES (
          TO_DATE(:menu_date, 'YYYY-MM-DD'),
          :is_published
        )
        `,
        {
          menu_date: menuDate,
          is_published: isPublished,
        },
      );

      await connection.commit();

      const created = await connection.execute(
        `
        SELECT
          menu_date_id AS "menuDateId",
          TO_CHAR(menu_date, 'YYYY-MM-DD') AS "menuDate",
          is_published AS "isPublished"
        FROM menu_dates
        WHERE menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        `,
        {
          menu_date: menuDate,
        },
        {
          outFormat: 4002,
        },
      );

      const row = (created.rows ?? [])[0] as
        | {
          menuDateId: number;
          menuDate: string;
          isPublished: string;
        }
        | undefined;

      if (!row) {
        return res.status(500).json({
          error: "Menu date was created but could not be retrieved.",
        });
      }

      return res.status(201).json({
        message: "Menu date created successfully.",
        menuDateId: Number(row.menuDateId),
        menuDate: row.menuDate,
        isPublished: row.isPublished,
      });
    } catch (error) {
      await connection?.rollback();

      console.error("Create menu date error:", error);

      return res.status(500).json({
        error: "Failed to create menu date.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - MENU FOR A SPECIFIC DATE
 * GET /api/menu/admin?date=YYYY-MM-DD
 * --------------------------------------------------------------------------
 */
router.get(
  "/admin",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const date = String(req.query.date ?? "");

      if (!date || !isValidDate(date)) {
        return res.status(400).json({
          error: "date query parameter is required. Use YYYY-MM-DD.",
        });
      }

      connection = await pool.getConnection();

      const dateResult = await connection.execute<AdminMenuDateRow>(
        `
        SELECT
            menu_date_id AS "menuDateId",
            TO_CHAR(menu_date, 'YYYY-MM-DD') AS "menuDate",
            is_published AS "isPublished"
        FROM menu_dates
        WHERE menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        `,
        { menu_date: date },
        { outFormat: 4002 },
      );

      const menuDate = (dateResult.rows ?? [])[0];

      if (!menuDate) {
        return res.status(404).json({
          error: "Menu date not found.",
        });
      }

      const itemResult = await connection.execute<MenuItemRow>(
        `
        SELECT
            mi.menu_item_id AS "menuItemId",
            mi.item_name AS "itemName",
            mi.description AS "description",
            mi.price AS "price",
            mi.is_available AS "isAvailable",
            NVL(s.available_qty, 0) AS "stockQuantity"
        FROM menu_items mi
        LEFT JOIN stock s
          ON s.menu_item_id = mi.menu_item_id
        WHERE mi.menu_date_id = :menu_date_id
        ORDER BY mi.menu_item_id
        `,
        {
          menu_date_id: menuDate.menuDateId,
        },
        { outFormat: 4002 },
      );

      const ingredientResult = await connection.execute<IngredientRow>(
        `
        SELECT
            ii.menu_item_id AS "menuItemId",
            i.ingredient_name AS "ingredientName"
        FROM item_ingredients ii
        JOIN ingredients i
          ON i.ingredient_id = ii.ingredient_id
        JOIN menu_items mi
          ON mi.menu_item_id = ii.menu_item_id
        WHERE mi.menu_date_id = :menu_date_id
        ORDER BY ii.menu_item_id, i.ingredient_name
        `,
        {
          menu_date_id: menuDate.menuDateId,
        },
        { outFormat: 4002 },
      );

      const ingredientsByItem = new Map<number, string[]>();

      for (const ingredient of ingredientResult.rows ?? []) {
        if (!ingredientsByItem.has(ingredient.menuItemId)) {
          ingredientsByItem.set(ingredient.menuItemId, []);
        }

        ingredientsByItem
          .get(ingredient.menuItemId)!
          .push(ingredient.ingredientName);
      }

      const items = (itemResult.rows ?? []).map((item) => ({
        ...item,
        ingredients: ingredientsByItem.get(item.menuItemId) ?? [],
      }));

      return res.json({
        ...menuDate,
        items,
      });
    } catch (error) {
      console.error("Admin menu error:", error);

      return res.status(500).json({
        error: "Failed to retrieve admin menu.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - PICKUP WINDOW MANAGEMENT
 * --------------------------------------------------------------------------
 */

router.get(
  "/admin/pickup-windows",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const date = String(req.query.date ?? "");

      if (!date || !isValidDate(date)) {
        return res.status(400).json({
          error: "date query parameter is required. Use YYYY-MM-DD.",
        });
      }

      connection = await pool.getConnection();

      const dateCheck = await connection.execute(
        `
        SELECT menu_date_id
        FROM menu_dates
        WHERE menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        `,
        {
          menu_date: date,
        },
        {
          outFormat: 4002,
        },
      );

      if ((dateCheck.rows ?? []).length === 0) {
        return res.status(404).json({
          error: "Menu date not found.",
        });
      }

      const result = await connection.execute<PickupWindowRow>(
        `
        SELECT
          pickup_window_id AS "pickupWindowId",
          TO_CHAR(start_time, 'HH24:MI') AS "startTime",
          TO_CHAR(end_time, 'HH24:MI') AS "endTime",
          capacity AS "capacity",
          reserved_count AS "reservedCount",
          capacity - reserved_count AS "availableCapacity"
        FROM pickup_windows
        WHERE window_date = TO_DATE(:window_date, 'YYYY-MM-DD')
        ORDER BY start_time
        `,
        {
          window_date: date,
        },
        {
          outFormat: 4002,
        },
      );

      return res.json({
        date,
        pickupWindows: result.rows ?? [],
      });
    } catch (error) {
      console.error("Admin pickup windows error:", error);

      return res.status(500).json({
        error: "Failed to retrieve pickup windows.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

router.post(
  "/admin/pickup-windows",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuDate = String(req.body.menuDate ?? "");
      const startTime = String(req.body.startTime ?? "");
      const endTime = String(req.body.endTime ?? "");
      const capacity = Number(req.body.capacity);

      if (!isValidDate(menuDate)) {
        return res.status(400).json({
          error: "menuDate must use YYYY-MM-DD format.",
        });
      }

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
        return res.status(400).json({
          error: "startTime must use HH:MM format.",
        });
      }

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
        return res.status(400).json({
          error: "endTime must use HH:MM format.",
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          error: "End time must be later than start time.",
        });
      }

      if (!Number.isInteger(capacity) || capacity <= 0) {
        return res.status(400).json({
          error: "capacity must be a positive integer.",
        });
      }

      connection = await pool.getConnection();

      const dateCheck = await connection.execute(
        `
        SELECT menu_date_id
        FROM menu_dates
        WHERE menu_date = TO_DATE(:menu_date, 'YYYY-MM-DD')
        `,
        {
          menu_date: menuDate,
        },
        {
          outFormat: 4002,
        },
      );

      if ((dateCheck.rows ?? []).length === 0) {
        return res.status(404).json({
          error: "Menu date not found. Create the menu date first.",
        });
      }

      const overlap = await connection.execute(
        `
        SELECT pickup_window_id
        FROM pickup_windows
        WHERE window_date = TO_DATE(:window_date, 'YYYY-MM-DD')
          AND start_time < TO_TIMESTAMP(:end_time, 'HH24:MI')
          AND end_time > TO_TIMESTAMP(:start_time, 'HH24:MI')
        `,
        {
          window_date: menuDate,
          start_time: startTime,
          end_time: endTime,
        },
        {
          outFormat: 4002,
        },
      );

      if ((overlap.rows ?? []).length > 0) {
        return res.status(409).json({
          error: "Pickup window overlaps an existing window for this date.",
        });
      }

      const result = await connection.execute(
        `
        INSERT INTO pickup_windows (
          window_date,
          start_time,
          end_time,
          capacity,
          reserved_count
        )
        VALUES (
          TO_DATE(:window_date, 'YYYY-MM-DD'),
          TO_TIMESTAMP(:start_time, 'HH24:MI'),
          TO_TIMESTAMP(:end_time, 'HH24:MI'),
          :capacity,
          0
        )
        RETURNING pickup_window_id INTO :pickup_window_id
        `,
        {
          window_date: menuDate,
          start_time: startTime,
          end_time: endTime,
          capacity,
          pickup_window_id: {
            dir: "out",
            type: "number",
          },
        },
      );

      await connection.commit();

      const outBinds = result.outBinds as {
        pickup_window_id: number[];
      };

      return res.status(201).json({
        message: "Pickup window created successfully.",
        pickupWindowId: Number(outBinds.pickup_window_id[0]),
        menuDate,
        startTime,
        endTime,
        capacity,
        reservedCount: 0,
        availableCapacity: capacity,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Create pickup window error:", error);

      return res.status(500).json({
        error: "Failed to create pickup window.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

router.patch(
  "/admin/pickup-windows/:pickupWindowId",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const pickupWindowId = Number(req.params.pickupWindowId);
      const startTime = String(req.body.startTime ?? "");
      const endTime = String(req.body.endTime ?? "");
      const capacity = Number(req.body.capacity);

      if (!Number.isInteger(pickupWindowId) || pickupWindowId <= 0) {
        return res.status(400).json({
          error: "Invalid pickup window ID.",
        });
      }

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
        return res.status(400).json({
          error: "startTime must use HH:MM format.",
        });
      }

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
        return res.status(400).json({
          error: "endTime must use HH:MM format.",
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          error: "End time must be later than start time.",
        });
      }

      if (!Number.isInteger(capacity) || capacity <= 0) {
        return res.status(400).json({
          error: "capacity must be a positive integer.",
        });
      }

      connection = await pool.getConnection();

      const currentResult = await connection.execute(
        `
        SELECT
          pickup_window_id,
          reserved_count,
          TO_CHAR(window_date, 'YYYY-MM-DD') AS window_date
        FROM pickup_windows
        WHERE pickup_window_id = :pickup_window_id
        FOR UPDATE
        `,
        {
          pickup_window_id: pickupWindowId,
        },
        {
          outFormat: 4002,
        },
      );

      const current = (currentResult.rows ?? [])[0] as
        | {
            PICKUP_WINDOW_ID?: number;
            RESERVED_COUNT?: number;
            WINDOW_DATE?: string;
            pickup_window_id?: number;
            reserved_count?: number;
            window_date?: string;
          }
        | undefined;

      if (!current) {
        return res.status(404).json({
          error: "Pickup window not found.",
        });
      }

      const reservedCount = Number(
        current.RESERVED_COUNT ?? current.reserved_count ?? 0,
      );
      const windowDate = String(
        current.WINDOW_DATE ?? current.window_date ?? "",
      );

      if (capacity < reservedCount) {
        return res.status(409).json({
          error: `Capacity cannot be reduced below the ${reservedCount} already reserved orders.`,
        });
      }

      const overlap = await connection.execute(
        `
        SELECT pickup_window_id
        FROM pickup_windows
        WHERE window_date = TO_DATE(:window_date, 'YYYY-MM-DD')
          AND pickup_window_id <> :pickup_window_id
          AND start_time < TO_TIMESTAMP(:end_time, 'HH24:MI')
          AND end_time > TO_TIMESTAMP(:start_time, 'HH24:MI')
        `,
        {
          window_date: windowDate,
          pickup_window_id: pickupWindowId,
          start_time: startTime,
          end_time: endTime,
        },
        {
          outFormat: 4002,
        },
      );

      if ((overlap.rows ?? []).length > 0) {
        return res.status(409).json({
          error: "Pickup window overlaps another window for this date.",
        });
      }

      await connection.execute(
        `
        UPDATE pickup_windows
        SET
          start_time = TO_TIMESTAMP(:start_time, 'HH24:MI'),
          end_time = TO_TIMESTAMP(:end_time, 'HH24:MI'),
          capacity = :capacity
        WHERE pickup_window_id = :pickup_window_id
        `,
        {
          start_time: startTime,
          end_time: endTime,
          capacity,
          pickup_window_id: pickupWindowId,
        },
      );

      await connection.commit();

      return res.json({
        message: "Pickup window updated successfully.",
        pickupWindowId,
        menuDate: windowDate,
        startTime,
        endTime,
        capacity,
        reservedCount,
        availableCapacity: capacity - reservedCount,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Update pickup window error:", error);

      return res.status(500).json({
        error: "Failed to update pickup window.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

router.delete(
  "/admin/pickup-windows/:pickupWindowId",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const pickupWindowId = Number(req.params.pickupWindowId);

      if (!Number.isInteger(pickupWindowId) || pickupWindowId <= 0) {
        return res.status(400).json({
          error: "Invalid pickup window ID.",
        });
      }

      connection = await pool.getConnection();

      const currentResult = await connection.execute(
        `
        SELECT reserved_count
        FROM pickup_windows
        WHERE pickup_window_id = :pickup_window_id
        `,
        {
          pickup_window_id: pickupWindowId,
        },
        {
          outFormat: 4002,
        },
      );

      const current = (currentResult.rows ?? [])[0] as
        | {
            RESERVED_COUNT?: number;
            reserved_count?: number;
          }
        | undefined;

      if (!current) {
        return res.status(404).json({
          error: "Pickup window not found.",
        });
      }

      const reservedCount = Number(
        current.RESERVED_COUNT ?? current.reserved_count ?? 0,
      );

      if (reservedCount > 0) {
        return res.status(409).json({
          error:
            `This pickup window cannot be deleted because ${reservedCount} order(s) are already reserved in it.`,
        });
      }

      await connection.execute(
        `
        DELETE FROM pickup_windows
        WHERE pickup_window_id = :pickup_window_id
        `,
        {
          pickup_window_id: pickupWindowId,
        },
      );

      await connection.commit();

      return res.json({
        message: "Pickup window deleted successfully.",
        pickupWindowId,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Delete pickup window error:", error);

      return res.status(500).json({
        error: "Failed to delete pickup window.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - INGREDIENT CATALOG
 * GET /api/menu/admin/ingredients
 * --------------------------------------------------------------------------
 */
router.get(
  "/admin/ingredients",
  authenticateToken,
  requireRole("ADMIN"),
  async (_req, res) => {
    let connection;

    try {
      connection = await pool.getConnection();

      const result = await connection.execute<IngredientCatalogRow>(
        `
        SELECT
            ingredient_id AS "ingredientId",
            ingredient_name AS "ingredientName"
        FROM ingredients
        ORDER BY ingredient_name
        `,
        {},
        { outFormat: 4002 },
      );

      return res.json({
        ingredients: result.rows ?? [],
      });
    } catch (error) {
      console.error("Ingredient catalog error:", error);

      return res.status(500).json({
        error: "Failed to retrieve ingredients.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - CREATE INGREDIENT
 * POST /api/menu/admin/ingredients
 * Body:
 * {
 *   "ingredientName": "Garlic"
 * }
 * --------------------------------------------------------------------------
 */
router.post(
  "/admin/ingredients",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const ingredientName = String(
        req.body.ingredientName ?? "",
      ).trim();

      if (!ingredientName) {
        return res.status(400).json({
          error: "ingredientName is required.",
        });
      }

      if (ingredientName.length > 100) {
        return res.status(400).json({
          error: "ingredientName cannot exceed 100 characters.",
        });
      }

      connection = await pool.getConnection();

      const duplicate = await connection.execute(
        `
        SELECT ingredient_id
        FROM ingredients
        WHERE UPPER(ingredient_name) = UPPER(:ingredient_name)
        `,
        { ingredient_name: ingredientName },
        { outFormat: 4002 },
      );

      if ((duplicate.rows ?? []).length > 0) {
        return res.status(409).json({
          error: "Ingredient already exists.",
        });
      }

      const result = await connection.execute(
        `
        INSERT INTO ingredients (
          ingredient_name
        )
        VALUES (
          :ingredient_name
        )
        RETURNING ingredient_id INTO :ingredient_id
        `,
        {
          ingredient_name: ingredientName,
          ingredient_id: {
            dir: "out",
            type: "number",
          },
        },
      );

      await connection.commit();

      const outBinds = result.outBinds as {
        ingredient_id: number[];
      };

      return res.status(201).json({
        message: "Ingredient created successfully.",
        ingredientId: Number(outBinds.ingredient_id[0]),
        ingredientName,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Create ingredient error:", error);

      return res.status(500).json({
        error: "Failed to create ingredient.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - CREATE MENU ITEM
 * POST /api/menu/admin/items
 *
 * Body:
 * {
 *   menuDateId: 1,
 *   itemName: "Chicken Biryani",
 *   description: "...",
 *   price: 120,
 *   isAvailable: "Y",
 *   stockQuantity: 50,
 *   ingredientIds: [1, 2, 3]
 * }
 * --------------------------------------------------------------------------
 */
router.post(
  "/admin/items",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuDateId = Number(req.body.menuDateId);
      const itemName = String(req.body.itemName ?? "").trim();
      const description = String(req.body.description ?? "").trim();
      const price = Number(req.body.price);
      const isAvailable = String(
        req.body.isAvailable ?? "Y",
      ).toUpperCase();
      const stockQuantity = Number(req.body.stockQuantity ?? 0);
      const ingredientIds: number[] = Array.isArray(
        req.body.ingredientIds,
      )
        ? req.body.ingredientIds
          .map(Number)
          .filter(
            (id: number) =>
              Number.isInteger(id) && id > 0,
          )
        : [];

      if (!Number.isInteger(menuDateId) || menuDateId <= 0) {
        return res.status(400).json({
          error: "Valid menuDateId is required.",
        });
      }

      if (!itemName) {
        return res.status(400).json({
          error: "itemName is required.",
        });
      }

      if (itemName.length > 100) {
        return res.status(400).json({
          error: "itemName cannot exceed 100 characters.",
        });
      }

      if (description.length > 500) {
        return res.status(400).json({
          error: "description cannot exceed 500 characters.",
        });
      }

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          error: "price must be greater than 0.",
        });
      }

      if (!["Y", "N"].includes(isAvailable)) {
        return res.status(400).json({
          error: "isAvailable must be Y or N.",
        });
      }

      if (
        !Number.isInteger(stockQuantity) ||
        stockQuantity < 0
      ) {
        return res.status(400).json({
          error: "stockQuantity must be a non-negative integer.",
        });
      }

      connection = await pool.getConnection();

      const dateCheck = await connection.execute(
        `
        SELECT menu_date_id
        FROM menu_dates
        WHERE menu_date_id = :menu_date_id
        `,
        { menu_date_id: menuDateId },
        { outFormat: 4002 },
      );

      if ((dateCheck.rows ?? []).length === 0) {
        return res.status(404).json({
          error: "Menu date not found.",
        });
      }

      const duplicate = await connection.execute(
        `
        SELECT menu_item_id
        FROM menu_items
        WHERE menu_date_id = :menu_date_id
          AND UPPER(item_name) = UPPER(:item_name)
        `,
        {
          menu_date_id: menuDateId,
          item_name: itemName,
        },
        { outFormat: 4002 },
      );

      if ((duplicate.rows ?? []).length > 0) {
        return res.status(409).json({
          error: "A menu item with this name already exists for this date.",
        });
      }

      const itemResult = await connection.execute(
        `
  INSERT INTO menu_items (
    menu_date_id,
    item_name,
    description,
    price,
    is_available
  )
  VALUES (
    :menu_date_id,
    :item_name,
    :description,
    :price,
    :is_available
  )
  RETURNING menu_item_id INTO :menu_item_id
  `,
        {
          menu_date_id: menuDateId,
          item_name: itemName,
          description,
          price,
          is_available: isAvailable,
          menu_item_id: {
            dir: "out",
            type: "number",
          },
        },
      );
      const itemOutBinds = itemResult.outBinds as {
        menu_item_id: number[];
      };

      const menuItemId = Number(itemOutBinds.menu_item_id[0]);

      await connection.execute(
        `
        INSERT INTO stock (
          menu_item_id,
          available_qty
        )
        VALUES (
          :menu_item_id,
          :available_qty
        )
        `,
        {
          menu_item_id: menuItemId,
          available_qty: stockQuantity,
        },
      );

      for (const ingredientId of ingredientIds) {
        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
          continue;
        }

        await connection.execute(
          `
          INSERT INTO item_ingredients (
            menu_item_id,
            ingredient_id
          )
          VALUES (
            :menu_item_id,
            :ingredient_id
          )
          `,
          {
            menu_item_id: menuItemId,
            ingredient_id: ingredientId,
          },
        );
      }

      await connection.commit();

      return res.status(201).json({
        message: "Menu item created successfully.",
        menuItemId,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Create menu item error:", error);

      return res.status(500).json({
        error: "Failed to create menu item.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - UPDATE MENU ITEM
 * PATCH /api/menu/admin/items/:menuItemId
 * --------------------------------------------------------------------------
 */
router.patch(
  "/admin/items/:menuItemId",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuItemId = Number(req.params.menuItemId);

      if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
        return res.status(400).json({
          error: "Invalid menu item ID.",
        });
      }

      const itemName = String(req.body.itemName ?? "").trim();
      const description = String(req.body.description ?? "").trim();
      const price = Number(req.body.price);
      const isAvailable = String(
        req.body.isAvailable ?? "Y",
      ).toUpperCase();

      if (!itemName) {
        return res.status(400).json({
          error: "itemName is required.",
        });
      }

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          error: "price must be greater than 0.",
        });
      }

      if (!["Y", "N"].includes(isAvailable)) {
        return res.status(400).json({
          error: "isAvailable must be Y or N.",
        });
      }

      connection = await pool.getConnection();

      const result = await connection.execute(
        `
        UPDATE menu_items
        SET
          item_name = :item_name,
          description = :description,
          price = :price,
          is_available = :is_available
        WHERE menu_item_id = :menu_item_id
        `,
        {
          item_name: itemName,
          description,
          price,
          is_available: isAvailable,
          menu_item_id: menuItemId,
        },
      );

      if ((result.rowsAffected ?? 0) === 0) {
        return res.status(404).json({
          error: "Menu item not found.",
        });
      }

      await connection.commit();

      return res.json({
        message: "Menu item updated successfully.",
        menuItemId,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Update menu item error:", error);

      return res.status(500).json({
        error: "Failed to update menu item.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - UPDATE STOCK
 * PUT /api/menu/admin/items/:menuItemId/stock
 * --------------------------------------------------------------------------
 */
router.put(
  "/admin/items/:menuItemId/stock",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuItemId = Number(req.params.menuItemId);
      const availableQty = Number(req.body.availableQty);

      if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
        return res.status(400).json({
          error: "Invalid menu item ID.",
        });
      }

      if (
        !Number.isInteger(availableQty) ||
        availableQty < 0
      ) {
        return res.status(400).json({
          error: "availableQty must be a non-negative integer.",
        });
      }

      connection = await pool.getConnection();

      const result = await connection.execute(
        `
        UPDATE stock
        SET available_qty = :available_qty
        WHERE menu_item_id = :menu_item_id
        `,
        {
          available_qty: availableQty,
          menu_item_id: menuItemId,
        },
      );

      if ((result.rowsAffected ?? 0) === 0) {
        return res.status(404).json({
          error: "Stock record not found for this menu item.",
        });
      }

      await connection.commit();

      return res.json({
        message: "Stock updated successfully.",
        menuItemId,
        availableQty,
      });
    } catch (error) {
      await connection?.rollback();
      console.error("Update stock error:", error);

      return res.status(500).json({
        error: "Failed to update stock.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - REPLACE INGREDIENT ASSIGNMENTS
 * PUT /api/menu/admin/items/:menuItemId/ingredients
 * Body:
 * {
 *   "ingredientIds": [1, 2, 3]
 * }
 * --------------------------------------------------------------------------
 */
router.put(
  "/admin/items/:menuItemId/ingredients",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuItemId = Number(req.params.menuItemId);

      if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
        return res.status(400).json({
          error: "Invalid menu item ID.",
        });
      }

      const ingredientIds: number[] = Array.isArray(
        req.body.ingredientIds,
      )
        ? req.body.ingredientIds
          .map(Number)
          .filter(
            (id: number) =>
              Number.isInteger(id) && id > 0,
          )
        : [];

      connection = await pool.getConnection();

      const menuItemResult = await connection.execute(
        `
        SELECT menu_item_id
        FROM menu_items
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
        {
          outFormat: 4002,
        },
      );

      if ((menuItemResult.rows ?? []).length === 0) {
        return res.status(404).json({
          error: "Menu item not found.",
        });
      }

      if (ingredientIds.length > 0) {
        const ingredientResult =
          await connection.execute(
            `
            SELECT ingredient_id
            FROM ingredients
            WHERE ingredient_id IN (${ingredientIds.join(",")})
            `,
            {},
            {
              outFormat: 4002,
            },
          );

        const existingIngredientIds = new Set(
          (ingredientResult.rows ?? []).map(
            (row: any) => Number(row.ingredient_id),
          ),
        );

        const invalidIngredientIds =
          ingredientIds.filter(
            (id) => !existingIngredientIds.has(id),
          );

        if (invalidIngredientIds.length > 0) {
          return res.status(400).json({
            error: "One or more ingredient IDs do not exist.",
            invalidIngredientIds,
          });
        }
      }

      await connection.execute(
        `
        DELETE FROM item_ingredients
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
      );

      for (const ingredientId of ingredientIds) {
        await connection.execute(
          `
          INSERT INTO item_ingredients (
            menu_item_id,
            ingredient_id
          )
          VALUES (
            :menu_item_id,
            :ingredient_id
          )
          `,
          {
            menu_item_id: menuItemId,
            ingredient_id: ingredientId,
          },
        );
      }

      await connection.commit();

      return res.json({
        message:
          "Ingredient assignments updated successfully.",
        menuItemId,
        ingredientIds,
      });
    } catch (error) {
      await connection?.rollback();

      console.error(
        "Update ingredients error:",
        error,
      );

      return res.status(500).json({
        error:
          "Failed to update ingredient assignments.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

/*
 * --------------------------------------------------------------------------
 * ADMIN - DELETE MENU ITEM
 * DELETE /api/menu/admin/items/:menuItemId
 * --------------------------------------------------------------------------
 */
router.delete(
  "/admin/items/:menuItemId",
  authenticateToken,
  requireRole("ADMIN"),
  async (req, res) => {
    let connection;

    try {
      const menuItemId = Number(req.params.menuItemId);

      if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
        return res.status(400).json({
          error: "Invalid menu item ID.",
        });
      }

      connection = await pool.getConnection();

      /*
       * Check whether the menu item exists.
       */
      const itemCheck = await connection.execute(
        `
        SELECT menu_item_id
        FROM menu_items
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
        {
          outFormat: 4002,
        },
      );

      if ((itemCheck.rows ?? []).length === 0) {
        return res.status(404).json({
          error: "Menu item not found.",
        });
      }

      /*
       * Do not physically delete an item that has already
       * been included in an order.
       */
      const orderCheck = await connection.execute(
        `
        SELECT COUNT(*) AS order_count
        FROM order_lines
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
        {
          outFormat: 4002,
        },
      );

      const orderCount = Number(
        (orderCheck.rows?.[0] as {
          ORDER_COUNT?: number;
          order_count?: number;
        })?.ORDER_COUNT ??
          (orderCheck.rows?.[0] as {
            order_count?: number;
          })?.order_count ??
          0,
      );

      if (orderCount > 0) {
        return res.status(409).json({
          error:
            "This menu item cannot be deleted because it has already been used in an order.",
        });
      }

      /*
       * Remove dependent records first.
       */
      await connection.execute(
        `
        DELETE FROM item_ingredients
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
      );

      await connection.execute(
        `
        DELETE FROM stock
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
      );

      /*
       * Finally remove the menu item.
       */
      await connection.execute(
        `
        DELETE FROM menu_items
        WHERE menu_item_id = :menu_item_id
        `,
        {
          menu_item_id: menuItemId,
        },
      );

      await connection.commit();

      return res.json({
        message: "Menu item deleted successfully.",
        menuItemId,
      });
    } catch (error) {
      await connection?.rollback();

      console.error("Delete menu item error:", error);

      return res.status(500).json({
        error: "Failed to delete menu item.",
      });
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  },
);

export default router;