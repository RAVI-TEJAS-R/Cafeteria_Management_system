import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import {
  authenticateToken,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticateToken, requireRole("ADMIN"));

router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const role = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : "ALL";
  const status = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "ALL";

  if (!['ALL', 'STUDENT', 'STAFF', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: "Invalid role filter" });
  }

  if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const result = await connection.execute(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         r.role_name,
         u.is_active,
         TO_CHAR(u.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE (:search IS NULL OR LOWER(u.full_name) LIKE '%' || LOWER(:search) || '%' OR LOWER(u.email) LIKE '%' || LOWER(:search) || '%')
         AND (:role = 'ALL' OR r.role_name = :role)
         AND (:status = 'ALL' OR (:status = 'ACTIVE' AND u.is_active = 'Y') OR (:status = 'INACTIVE' AND u.is_active = 'N'))
       ORDER BY u.user_id`,
      {
        search: search || null,
        role,
        status,
      },
    );

    const users = (result.rows ?? []).map((row) => {
      const [userId, fullName, email, roleName, isActive, createdAt] = row as [
        number,
        string,
        string,
        string,
        string,
        string,
      ];

      return {
        userId,
        fullName,
        email,
        role: roleName,
        status: isActive === "Y" ? "ACTIVE" : "INACTIVE",
        createdAt,
      };
    });

    return res.json({ users });
  } catch (error) {
    console.error("USER LIST ERROR:", error);
    return res.status(500).json({ error: "Unable to load users" });
  } finally {
    if (connection) await connection.close();
  }
});

router.post("/staff", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "fullName, email and password are required" });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedName = String(fullName).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const existing = await connection.execute(
      `SELECT user_id FROM users WHERE LOWER(email) = :email`,
      { email: normalizedEmail },
    );

    if ((existing.rows?.length ?? 0) > 0) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const roleResult = await connection.execute<[number]>(
      `SELECT role_id FROM roles WHERE role_name = 'STAFF'`,
    );

    if (!roleResult.rows?.length) {
      return res.status(500).json({ error: "STAFF role not found" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await connection.execute(
      `INSERT INTO users (role_id, full_name, email, password_hash, is_active)
       VALUES (:role_id, :full_name, :email, :password_hash, 'Y')
       RETURNING user_id INTO :user_id`,
      {
        role_id: roleResult.rows[0][0],
        full_name: normalizedName,
        email: normalizedEmail,
        password_hash: passwordHash,
        user_id: { dir: "out", type: "number" },
      },
    );

    await connection.commit();

    const userId = result.outBinds
      ? (result.outBinds as { user_id: number }).user_id
      : null;

    return res.status(201).json({
      userId,
      fullName: normalizedName,
      email: normalizedEmail,
      role: "STAFF",
      status: "ACTIVE",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("STAFF CREATION ERROR:", error);
    return res.status(500).json({ error: "Unable to create staff account" });
  } finally {
    if (connection) await connection.close();
  }
});

router.patch("/:userId/status", async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.userId);
  const status = req.body?.status;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (status !== "Y" && status !== "N") {
    return res.status(400).json({ error: "Status must be Y or N" });
  }

  if (req.user?.userId === userId) {
    return res.status(400).json({ error: "You cannot change your own account status" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(
      `UPDATE users SET is_active = :status WHERE user_id = :user_id`,
      { status, user_id: userId },
    );

    if ((result.rowsAffected ?? 0) !== 1) {
      return res.status(404).json({ error: "User not found" });
    }

    await connection.commit();
    return res.json({
      message: status === "Y" ? "Account activated" : "Account deactivated",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("USER STATUS ERROR:", error);
    return res.status(500).json({ error: "Unable to update account status" });
  } finally {
    if (connection) await connection.close();
  }
});

router.patch("/:userId/role", async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.userId);
  const role = req.body?.role;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (role !== "STUDENT" && role !== "STAFF") {
    return res.status(400).json({ error: "Role can only be changed between STUDENT and STAFF" });
  }

  if (req.user?.userId === userId) {
    return res.status(400).json({ error: "You cannot change your own role" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const roleResult = await connection.execute<[number]>(
      `SELECT role_id FROM roles WHERE role_name = :role`,
      { role },
    );

    if (!roleResult.rows?.length) {
      return res.status(400).json({ error: "Selected role does not exist" });
    }

    const result = await connection.execute(
      `UPDATE users
       SET role_id = :role_id
       WHERE user_id = :user_id
         AND role_id IN (SELECT role_id FROM roles WHERE role_name IN ('STUDENT', 'STAFF'))`,
      { role_id: roleResult.rows[0][0], user_id: userId },
    );

    if ((result.rowsAffected ?? 0) !== 1) {
      const target = await connection.execute(
        `SELECT r.role_name FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = :user_id`,
        { user_id: userId },
      );

      if (!target.rows?.length) return res.status(404).json({ error: "User not found" });
      return res.status(400).json({ error: "ADMIN accounts cannot be changed to STUDENT or STAFF here" });
    }

    await connection.commit();
    return res.json({ message: `User role changed to ${role}` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("USER ROLE ERROR:", error);
    return res.status(500).json({ error: "Unable to update user role" });
  } finally {
    if (connection) await connection.close();
  }
});

router.patch("/:userId/password", async (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.userId);
  const password = req.body?.password;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  if (req.user?.userId === userId) {
    return res.status(400).json({ error: "Use the account recovery/password change flow for your own account" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await connection.execute(
      `UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id`,
      { password_hash: passwordHash, user_id: userId },
    );

    if ((result.rowsAffected ?? 0) !== 1) {
      return res.status(404).json({ error: "User not found" });
    }

    await connection.commit();
    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("PASSWORD RESET ERROR:", error);
    return res.status(500).json({ error: "Unable to reset password" });
  } finally {
    if (connection) await connection.close();
  }
});

export default router;
