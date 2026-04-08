import pool from "../_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create tables
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
    // Seed Clients
    const stellantisRes = await pool.query('INSERT INTO admin_clients (name) VALUES ($1) RETURNING id', ['Stellantis']);
    const pepsicoRes = await pool.query('INSERT INTO admin_clients (name) VALUES ($1) RETURNING id', ['Pepsico']);
    
    const stellantisId = stellantisRes.rows[0].id;
    const pepsicoId = pepsicoRes.rows[0].id;

    // Seed Service Desks
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
        
        // Seed default views
        const viewName = roleName.startsWith('Líder') ? 'My Team' : 'My Indicators';
        const viewRes = await pool.query('INSERT INTO admin_views (role_id, name, order_index) VALUES ($1, $2, $3) RETURNING id', [roleId, viewName, 0]);
        const viewId = viewRes.rows[0].id;

        // Seed default components for this view
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
  } catch (error) {
    console.error("Init error:", error);
    res.status(500).json({ error: error.message });
  }
}
