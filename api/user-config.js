import pool from "./_lib/db.js";

export default async function handler(req, res) {
  const { rfc, roleName } = req.query;

  if (!rfc) {
    return res.status(400).json({ error: "RFC is required" });
  }

  try {
    // 1. Find user's role from overrides
    const overrideRes = await pool.query('SELECT role_id FROM admin_user_overrides WHERE rfc = $1', [rfc]);
    
    let roleId = null;
    if (overrideRes.rows.length > 0 && overrideRes.rows[0].role_id) {
      roleId = overrideRes.rows[0].role_id;
    }

    if (!roleId && roleName) {
      // Fallback: Try to find a role by name
      const roleRes = await pool.query('SELECT id FROM admin_roles WHERE name = $1 LIMIT 1', [roleName]);
      if (roleRes.rows.length > 0) {
        roleId = roleRes.rows[0].id;
      }
    }

    if (!roleId) {
      return res.json({ views: [], components: [] });
    }

    // 2. Fetch views for this role
    const viewsRes = await pool.query('SELECT * FROM admin_views WHERE role_id = $1 ORDER BY order_index', [roleId]);
    const views = viewsRes.rows;

    if (views.length === 0) {
      return res.json({ views: [], components: [] });
    }

    // 3. Fetch components for these views
    const viewIds = views.map(v => v.id);
    const componentsRes = await pool.query('SELECT * FROM admin_components WHERE view_id = ANY($1) ORDER BY view_id, order_index', [viewIds]);
    const components = componentsRes.rows;

    res.json({
      views,
      components
    });
  } catch (error) {
    console.error("User config error:", error);
    res.status(500).json({ error: error.message });
  }
}
