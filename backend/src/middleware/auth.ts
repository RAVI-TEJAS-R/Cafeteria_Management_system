import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("JWT_SECRET is not configured");
})();

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication token required",
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
      userId: number;
      email: string;
      role: string;
    };

    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(
        `SELECT
           u.user_id,
           u.email,
           u.is_active,
           r.role_name
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = :user_id`,
        { user_id: decoded.userId },
      );

      if (!result.rows?.length) {
        return res.status(401).json({ error: "Account no longer exists" });
      }

      const [userId, email, isActive, role] = result.rows[0] as [
        number,
        string,
        string,
        string,
      ];

      if (isActive !== "Y") {
        return res.status(403).json({ error: "Account is inactive" });
      }

      req.user = {
        userId,
        email,
        role,
      };
    } finally {
      await connection.close();
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid or expired authentication token",
      });
    }

    console.error("AUTHENTICATION ERROR:", error);
    return res.status(500).json({
      error: "Authentication service unavailable",
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
      });
    }

    next();
  };
}
