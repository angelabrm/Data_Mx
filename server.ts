import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Admin Config Routes
  app.get("/api/admin/config", async (req, res) => {
    try {
      const clients = await pool.query("SELECT * FROM admin_clients ORDER BY name");
      const desks = await pool.query("SELECT * FROM admin_service_desks ORDER BY name");
      const roles = await pool.query(`
        SELECT r.*, sd.name as service_desk_name, c.name as client_name 
        FROM admin_roles r
        JOIN admin_service_desks sd ON r.service_desk_id = sd.id
        JOIN admin_clients c ON sd.client_id = c.id
        ORDER BY c.name, sd.name, r.name
      `);
      const overrides = await pool.query("SELECT * FROM admin_user_overrides");

      res.json({
        clients: clients.rows,
        serviceDesks: desks.rows,
        roles: roles.rows,
        overrides: overrides.rows
      });
    } catch (error: any) {
      console.error("Error fetching config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // NEW: Save Batch Configuration
  app.post("/api/admin/save-config", async (req, res) => {
    const { clients } = req.body;
    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      
      // Sync Clients
      // 1. Get existing clients
      const existingRes = await dbClient.query("SELECT id FROM admin_clients");
      const existingIds = existingRes.rows.map(r => r.id);
      
      // 2. Delete clients not in the new list
      const newIds = clients.map((c: any) => c.id).filter((id: any) => typeof id === 'number' && id < 1000000000000); // Filter out temp IDs
      const toDelete = existingIds.filter(id => !newIds.includes(id));
      if (toDelete.length > 0) {
        await dbClient.query("DELETE FROM admin_clients WHERE id = ANY($1)", [toDelete]);
      }
      
      // 3. Insert or Update clients
      for (const clientData of clients) {
        if (typeof clientData.id === 'number' && clientData.id < 1000000000000) {
          // Update existing
          await dbClient.query("UPDATE admin_clients SET name = $1 WHERE id = $2", [clientData.name, clientData.id]);
        } else {
          // Insert new
          await dbClient.query("INSERT INTO admin_clients (name) VALUES ($1)", [clientData.name]);
        }
      }
      
      await dbClient.query("COMMIT");
      res.json({ message: "Configuration saved successfully" });
    } catch (error: any) {
      await dbClient.query("ROLLBACK");
      console.error("Error saving config:", error);
      res.status(500).json({ error: error.message });
    } finally {
      dbClient.release();
    }
  });

  // Init DB Route
  app.post("/api/admin/init", async (req, res) => {
    try {
      await pool.query(`
        DROP TABLE IF EXISTS admin_user_overrides CASCADE;
        DROP TABLE IF EXISTS admin_components CASCADE;
        DROP TABLE IF EXISTS admin_views CASCADE;
        DROP TABLE IF EXISTS admin_roles CASCADE;
        DROP TABLE IF EXISTS admin_service_desks CASCADE;
        DROP TABLE IF EXISTS admin_clients CASCADE;

        CREATE TABLE admin_clients (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE admin_service_desks (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES admin_clients(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          UNIQUE(client_id, name)
        );

        CREATE TABLE admin_roles (
          id SERIAL PRIMARY KEY,
          service_desk_id INTEGER REFERENCES admin_service_desks(id) ON DELETE CASCADE,
          name TEXT NOT NULL
        );

        CREATE TABLE admin_views (
          id SERIAL PRIMARY KEY,
          role_id INTEGER REFERENCES admin_roles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          order_index INTEGER DEFAULT 0
        );

        CREATE TABLE admin_components (
          id SERIAL PRIMARY KEY,
          view_id INTEGER REFERENCES admin_views(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          config JSONB DEFAULT '{}',
          order_index INTEGER DEFAULT 0
        );

        CREATE TABLE admin_user_overrides (
          rfc TEXT PRIMARY KEY,
          role_id INTEGER REFERENCES admin_roles(id) ON DELETE SET NULL,
          is_admin BOOLEAN DEFAULT FALSE
        );
      `);

      // Seed initial data
      const stellantisRes = await pool.query("INSERT INTO admin_clients (name) VALUES ($1) RETURNING id", ["Stellantis"]);
      const pepsicoRes = await pool.query("INSERT INTO admin_clients (name) VALUES ($1) RETURNING id", ["Pepsico"]);
      
      const stellantisId = stellantisRes.rows[0].id;
      const pepsicoId = pepsicoRes.rows[0].id;

      const desksToSeed = [
        { clientId: stellantisId, name: 'CAC', roles: ['Líder CAC', 'Agente CAC'] },
        { clientId: stellantisId, name: 'Fleet', roles: ['Líder Fleet', 'Agente Fleet'] },
        { clientId: stellantisId, name: 'Premium', roles: ['Líder Premium', 'Agente Premium'] },
        { clientId: pepsicoId, name: 'PMO', roles: ['Líder PMO', 'Agente PMO'] }
      ];

      for (const deskInfo of desksToSeed) {
        const deskRes = await pool.query('INSERT INTO admin_service_desks (client_id, name) VALUES ($1, $2) RETURNING id', [deskInfo.clientId, deskInfo.name]);
        const deskId = deskRes.rows[0].id;

        for (const roleName of deskInfo.roles) {
          const roleRes = await pool.query('INSERT INTO admin_roles (service_desk_id, name) VALUES ($1, $2) RETURNING id', [deskId, roleName]);
          const roleId = roleRes.rows[0].id;
          
          const viewName = roleName.startsWith('Líder') ? 'My Team' : 'My Indicators';
          const viewRes = await pool.query('INSERT INTO admin_views (role_id, name, order_index) VALUES ($1, $2, $3) RETURNING id', [roleId, viewName, 0]);
          const viewId = viewRes.rows[0].id;

          const componentsToSeed = [
            { type: 'stats', title: 'Operational Stats', order: 0 },
            { type: 'cases_chart', title: 'Case Management', order: 1 },
            { type: 'calls_chart', title: 'Call Volume', order: 2 },
            { type: 'qa_chart', title: 'Quality Assurance', order: 3 },
            { type: 'gauges', title: 'Performance Gauges', order: 4 }
          ];

          for (const comp of componentsToSeed) {
            await pool.query(
              'INSERT INTO admin_components (view_id, type, title, config, order_index) VALUES ($1, $2, $3, $4, $5)',
              [viewId, comp.type, comp.title, JSON.stringify({}), comp.order]
            );
          }
        }
      }

      res.json({ message: "Database initialized successfully" });
    } catch (error: any) {
      console.error("Init error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
