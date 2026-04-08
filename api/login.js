import sheets from "./_lib/google.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rfc } = req.body;
  
  if (!rfc) {
    return res.status(400).json({ error: "RFC is required" });
  }

  try {
    const sheetName = process.env.GOOGLE_SHEET_NAME || "Roster";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Roster not found" });
    }

    const headers = rows[0];
    const docIndex = headers.indexOf("Documento");
    const nameIndex = headers.indexOf("Nombre");
    const vistaIndex = headers.indexOf("Vista Dash");
    const compassIndex = headers.indexOf("Compass");
    const genesysIndex = headers.indexOf("Genesys");
    const qaIndex = headers.indexOf("QA");

    if (docIndex === -1 || vistaIndex === -1 || compassIndex === -1 || genesysIndex === -1) {
      return res.status(500).json({ error: "Required columns missing in Roster" });
    }

    const userRow = rows.find((row) => row[docIndex] === rfc);

    if (!userRow) {
      return res.status(401).json({ error: "RFC not found" });
    }

    // Check for database overrides
    let isAdmin = rfc === "23981273" || userRow[nameIndex] === "Santiago Lopez";
    let vistaDash = userRow[vistaIndex];
    let clientName = "";
    let serviceDeskName = "";

    try {
      const pool = (await import("./_lib/db.js")).default;
      const overrideRes = await pool.query(`
        SELECT 
          o.*, 
          r.name as role_name,
          sd.name as service_desk_name,
          c.name as client_name
        FROM admin_user_overrides o 
        LEFT JOIN admin_roles r ON o.role_id = r.id 
        LEFT JOIN admin_service_desks sd ON r.service_desk_id = sd.id
        LEFT JOIN admin_clients c ON sd.client_id = c.id
        WHERE o.rfc = $1
      `, [rfc]);
      
      if (overrideRes.rows.length > 0) {
        const override = overrideRes.rows[0];
        if (override.role_name) {
          // If we have a role from the DB, we use it. 
          // We can also construct a full name if needed, but for now let's just provide the components.
          vistaDash = override.role_name;
          clientName = override.client_name;
          serviceDeskName = override.service_desk_name;
        }
        if (override.is_admin !== null) isAdmin = override.is_admin;
      }
    } catch (dbErr) {
      console.error("DB override check failed:", dbErr);
    }

    const userData = {
      rfc: userRow[docIndex],
      name: nameIndex !== -1 ? userRow[nameIndex] : "User",
      vistaDash,
      clientName,
      serviceDeskName,
      compass: userRow[compassIndex] || "",
      genesys: userRow[genesysIndex] || "",
      qa: qaIndex !== -1 ? userRow[qaIndex] || "" : "",
      isAdmin
    };

    res.json(userData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
