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

    const userData = {
      rfc: userRow[docIndex],
      name: nameIndex !== -1 ? userRow[nameIndex] : "User",
      vistaDash: userRow[vistaIndex],
      compass: userRow[compassIndex] || "",
      genesys: userRow[genesysIndex] || "",
      qa: qaIndex !== -1 ? userRow[qaIndex] || "" : "",
    };

    res.json(userData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
