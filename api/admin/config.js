import pool from "../_lib/db.js";

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const clients = await pool.query('SELECT * FROM admin_clients ORDER BY name');
      const serviceDesks = await pool.query('SELECT * FROM admin_service_desks ORDER BY client_id, name');
      const roles = await pool.query(`
        SELECT 
          r.*, 
          sd.name as service_desk_name, 
          c.name as client_name 
        FROM admin_roles r
        LEFT JOIN admin_service_desks sd ON r.service_desk_id = sd.id
        LEFT JOIN admin_clients c ON sd.client_id = c.id
        ORDER BY c.name, sd.name, r.name
      `);
      const views = await pool.query('SELECT * FROM admin_views ORDER BY role_id, order_index');
      const components = await pool.query('SELECT * FROM admin_components ORDER BY view_id, order_index');
      const overrides = await pool.query(`
        SELECT 
          o.*, 
          r.name as role_name,
          sd.name as service_desk_name,
          c.name as client_name
        FROM admin_user_overrides o 
        LEFT JOIN admin_roles r ON o.role_id = r.id
        LEFT JOIN admin_service_desks sd ON r.service_desk_id = sd.id
        LEFT JOIN admin_clients c ON sd.client_id = c.id
      `);

      return res.json({
        clients: clients.rows,
        serviceDesks: serviceDesks.rows,
        roles: roles.rows,
        views: views.rows,
        components: components.rows,
        overrides: overrides.rows
      });
    }

    if (method === 'POST') {
      const { type, data } = req.body;

      if (type === 'client') {
        const { name } = data;
        const result = await pool.query('INSERT INTO admin_clients (name) VALUES ($1) RETURNING *', [name]);
        return res.json(result.rows[0]);
      }

      if (type === 'service_desk') {
        const { client_id, name } = data;
        const result = await pool.query('INSERT INTO admin_service_desks (client_id, name) VALUES ($1, $2) RETURNING *', [client_id, name]);
        return res.json(result.rows[0]);
      }

      if (type === 'role') {
        const { service_desk_id, name } = data;
        const result = await pool.query('INSERT INTO admin_roles (service_desk_id, name) VALUES ($1, $2) RETURNING *', [service_desk_id, name]);
        return res.json(result.rows[0]);
      }

      if (type === 'view') {
        const { role_id, name, order_index } = data;
        const result = await pool.query('INSERT INTO admin_views (role_id, name, order_index) VALUES ($1, $2, $3) RETURNING *', [role_id, name, order_index]);
        return res.json(result.rows[0]);
      }

      if (type === 'component') {
        const { view_id, type: compType, title, config, order_index } = data;
        const result = await pool.query('INSERT INTO admin_components (view_id, type, title, config, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING *', [view_id, compType, title, JSON.stringify(config), order_index]);
        return res.json(result.rows[0]);
      }

      if (type === 'override') {
        const { rfc, role_id, is_admin } = data;
        const result = await pool.query('INSERT INTO admin_user_overrides (rfc, role_id, is_admin) VALUES ($1, $2, $3) ON CONFLICT (rfc) DO UPDATE SET role_id = $2, is_admin = $3 RETURNING *', [rfc, role_id, is_admin]);
        return res.json(result.rows[0]);
      }
    }

    if (method === 'DELETE') {
      const { type, id } = req.query;
      if (type === 'client') await pool.query('DELETE FROM admin_clients WHERE id = $1', [id]);
      if (type === 'service_desk') await pool.query('DELETE FROM admin_service_desks WHERE id = $1', [id]);
      if (type === 'role') await pool.query('DELETE FROM admin_roles WHERE id = $1', [id]);
      if (type === 'view') await pool.query('DELETE FROM admin_views WHERE id = $1', [id]);
      if (type === 'component') await pool.query('DELETE FROM admin_components WHERE id = $1', [id]);
      if (type === 'override') await pool.query('DELETE FROM admin_user_overrides WHERE rfc = $1', [id]);
      return res.json({ message: "Deleted successfully" });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Config error:", error);
    res.status(500).json({ error: error.message });
  }
}
