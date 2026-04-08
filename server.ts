import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import geminiHandler from "./api/gemini.js";
import loginHandler from "./api/login.js";
import teamMembersHandler from "./api/team-members.js";
import dashboardDataHandler from "./api/dashboard-data.js";
import healthHandler from "./api/health.js";
import adminInitHandler from "./api/admin/init.js";
import adminConfigHandler from "./api/admin/config.js";
import userConfigHandler from "./api/user-config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Database Pool (Used for local dev if needed, but handlers use their own)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Google Sheets Auth (Used for local dev if needed, but handlers use their own)
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // API Routes
  app.post("/api/login", loginHandler);
  app.get("/api/team-members", teamMembersHandler);
  app.post("/api/gemini", geminiHandler);
  app.get("/api/dashboard-data", dashboardDataHandler);
  app.get("/api/health", healthHandler);
  app.post("/api/admin/init", adminInitHandler);
  app.get("/api/admin/config", adminConfigHandler);
  app.post("/api/admin/config", adminConfigHandler);
  app.delete("/api/admin/config", adminConfigHandler);
  app.get("/api/user-config", userConfigHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
