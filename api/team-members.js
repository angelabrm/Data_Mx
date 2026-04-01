import sheets from "./_lib/google.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role } = req.query;

  try {
    const sheetName = process.env.GOOGLE_SHEET_NAME || "Roster";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.json([]);

    const headers = rows[0];
    const nameIndex = headers.indexOf("Nombre");
    const vistaIndex = headers.indexOf("Vista Dash");
    const compassIndex = headers.indexOf("Compass");
    const genesysIndex = headers.indexOf("Genesys");
    const qaIndex = headers.indexOf("QA");

    let targetAgentRole = "";
    if (role === "Líder CAC") targetAgentRole = "Agente CAC";
    else if (role === "Líder Premium") targetAgentRole = "Agente Premium";
    else if (role === "Líder Fleet") targetAgentRole = "Agente Fleet";

    const agents = rows.slice(1)
      .filter(row => row[vistaIndex] === targetAgentRole)
      .map(row => ({
        name: row[nameIndex],
        compass: row[compassIndex],
        genesys: row[genesysIndex],
        qa: qaIndex !== -1 ? row[qaIndex] || "" : ""
      }));

    res.json(agents);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
