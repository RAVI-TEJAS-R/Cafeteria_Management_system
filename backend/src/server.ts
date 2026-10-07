import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import menuRouter from "./routes/menu.js";
import ordersRouter from "./routes/orders.js";
import authRouter from "./routes/auth.js";
import reportsRouter from "./routes/reports.js";
import usersRouter from "./routes/users.js";
import { ensureDatabase } from "./ensure-database.js";

const app = express();

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
  })
);

app.use(express.json());

app.use("/api/reports", reportsRouter);
app.use("/api/auth", authRouter);
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", async (_req, res) => {
  try {
    const connection = await pool.getConnection();

    await connection.execute("SELECT 1");
    await connection.close();

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

const PORT = Number(process.env.PORT) || 3000;

ensureDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });