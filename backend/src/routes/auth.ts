import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/register", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            error: "fullName, email and password are required"
        });
    }

    if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
            error: "Password must be at least 6 characters"
        });
    }

    const connection = await pool.getConnection();

    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedName = String(fullName).trim();

        const existingUser = await connection.execute(
            `SELECT user_id
       FROM users
       WHERE LOWER(email) = :email`,
            { email: normalizedEmail }
        );

        if ((existingUser.rows?.length ?? 0) > 0) {
            return res.status(409).json({
                error: "Email is already registered"
            });
        }

        const roleResult = await connection.execute<[number]>(
            `SELECT role_id
       FROM roles
       WHERE role_name = 'STUDENT'`
        );

        if (!roleResult.rows?.length) {
            return res.status(500).json({
                error: "STUDENT role not found"
            });
        }

        const roleId = roleResult.rows[0][0];

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await connection.execute(
            `INSERT INTO users
       (
         role_id,
         full_name,
         email,
         password_hash,
         is_active
       )
       VALUES
       (
         :role_id,
         :full_name,
         :email,
         :password_hash,
         'Y'
       )
       RETURNING user_id INTO :user_id`,
            {
                role_id: roleId,
                full_name: normalizedName,
                email: normalizedEmail,
                password_hash: passwordHash,
                user_id: {
                    dir: "out",
                    type: "number"
                }
            }
        );

        await connection.commit();

        const userId = result.outBinds
            ? (result.outBinds as { user_id: number }).user_id
            : null;

        return res.status(201).json({
            message: "Registration successful",
            userId,
            fullName: normalizedName,
            email: normalizedEmail,
            role: "STUDENT"
        });

    } catch (error) {
        await connection.rollback();

        console.error("REGISTRATION ERROR:");
        console.error(error);

        return res.status(500).json({
            error: "Registration failed"
        });

    } finally {
        await connection.close();
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "email and password are required"
        });
    }

    const connection = await pool.getConnection();

    try {
        const normalizedEmail = String(email).trim().toLowerCase();

        const result = await connection.execute(
            `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.password_hash,
         u.is_active,
         r.role_name
       FROM users u
       JOIN roles r
         ON r.role_id = u.role_id
       WHERE LOWER(u.email) = :email`,
            {
                email: normalizedEmail
            }
        );

        if (!result.rows?.length) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const row = result.rows[0] as [
            number,
            string,
            string,
            string,
            string,
            string
        ];

        const [
            userId,
            fullName,
            userEmail,
            passwordHash,
            isActive,
            role
        ] = row;

        if (isActive !== "Y") {
            return res.status(403).json({
                error: "Account is inactive"
            });
        }

        const passwordValid = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!passwordValid) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
            throw new Error("JWT_SECRET is not configured");
        })();

        const token = jwt.sign(
            {
                userId,
                email: userEmail,
                role
            },
            JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        return res.json({
            message: "Login successful",
            token,
            userId,
            fullName,
            email: userEmail,
            role
        });

    } catch (error) {
        console.error("LOGIN ERROR:");
        console.error(error);

        return res.status(500).json({
            error: "Login failed"
        });

    } finally {
        await connection.close();
    }
});

export default router;