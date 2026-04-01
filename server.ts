import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import geminiHandler from "./api/gemini.js";

dotenv.config();

const { Pool } = pg;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Database Pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Google Sheets Auth
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { rfc } = req.body;
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
        return res.status(500).json({ error: "Required columns (Documento, Nombre, Vista Dash, Compass, Genesys) missing in Roster" });
      }

      const userRow = rows.find((row) => row[docIndex] === rfc);

      if (!userRow) {
        console.warn(`Login attempt failed: RFC "${rfc}" not found in sheet.`);
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

      console.log(`Login successful for RFC: ${rfc}. Vista: ${userData.vistaDash}, Compass: ${userData.compass}, Genesys: ${userData.genesys}`);
      res.json(userData);
    } catch (error: any) {
      console.error("Login error:", error.message || error);
      if (error.message?.includes("Unable to parse range")) {
        return res.status(400).json({ 
          error: `The sheet name "${process.env.GOOGLE_SHEET_NAME || "Roster"}" was not found in the spreadsheet. Please check the name in Google Sheets and update GOOGLE_SHEET_NAME in secrets.` 
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/team-members", async (req, res) => {
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

      // Determine which agents to fetch based on the leader's role
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
  });

  app.post("/api/gemini", geminiHandler);

  app.get("/api/dashboard-data", async (req, res) => {
    const { rfc, compass, genesys, qa, startDate, endDate, vistaDash } = req.query;

    if (!rfc || !compass || !genesys) {
      return res.status(400).json({ error: "Missing parameters (rfc, compass, or genesys)" });
    }

    try {
      // If Líder CAC and compass/genesys are comma-separated strings (multiple agents)
      const compassList = (compass as string).split(',').map(s => s.trim());
      const genesysList = (genesys as string).split(',').map(s => s.trim());
      const qaList = (qa as string || "").split(',').map(s => s.trim()).filter(Boolean).filter(s => s.toLowerCase() !== 'none');

      let abiertosWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Case Owner")) = ANY($1)';
      let cerradosWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Case Closed By")) = ANY($1)';
      let rendimientoWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Nombre del agente")) = ANY($1)';
      let qaWhere = qaList.length === 0 ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Agente")) = ANY($1)';
      let aunAbiertosWhere = 'WHERE 1=1';
      
      const queryParamsAbiertos: any[] = [compassList.map(s => s.toLowerCase())];
      const queryParamsCerrados: any[] = [compassList.map(s => s.toLowerCase())];
      const queryParamsRendimiento: any[] = [compassList.map(s => s.toLowerCase())]; 
      const queryParamsQA: any[] = [qaList.map(s => s.toLowerCase())];
      const queryParamsAunAbiertos: any[] = [];

      if (startDate || endDate) {
        // Robust date parsing for custom formats
        // Abiertos[Date Opened 2]: '13/10/2025' (D/M/YYYY)
        // Cerrados[Date Closed 2]: '24/10/2025' (D/M/YYYY)
        // Rendimiento_agente[Inicio del intervalo]: '18/09/2025 12:00:00 a. m.' (D/M/YYYY)
        // QA_MX[Marca temporal]: '19/11/2025 4:26:48 p. m.' (D/M/YYYY)
        
        if (startDate) {
          queryParamsAbiertos.push(startDate);
          queryParamsCerrados.push(startDate);
          queryParamsRendimiento.push(startDate);
          queryParamsQA.push(startDate);
          
          // Use a CASE statement to handle both string formats and native date/timestamp types
          // Abiertos: '13/10/2025' (D/M/YYYY)
          abiertosWhere += ` AND (CASE 
            WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Opened 2"::date 
          END) >= $${queryParamsAbiertos.length}::date`;

          // Cerrados: '24/10/2025' (D/M/YYYY)
          cerradosWhere += ` AND (CASE 
            WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Closed 2"::date 
          END) >= $${queryParamsCerrados.length}::date`;
          
          // Rendimiento: '18/09/2025 12:00:00 a. m.' (D/M/YYYY)
          rendimientoWhere += ` AND (CASE 
            WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Inicio del intervalo"::date 
          END) >= $${queryParamsRendimiento.length}::date`;

          // QA: '19/11/2025 4:26:48 p. m.' (D/M/YYYY)
          qaWhere += ` AND (CASE 
            WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Marca temporal"::date 
          END) >= $${queryParamsQA.length}::date`;

          queryParamsAunAbiertos.push(startDate);
          aunAbiertosWhere += ` AND "fecha_en_que_esta_abierto"::date >= $${queryParamsAunAbiertos.length}::date`;
        }
        
        if (endDate) {
          queryParamsAbiertos.push(endDate);
          queryParamsCerrados.push(endDate);
          queryParamsRendimiento.push(endDate);
          queryParamsQA.push(endDate);
          
          abiertosWhere += ` AND (CASE 
            WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Opened 2"::date 
          END) <= $${queryParamsAbiertos.length}::date`;

          cerradosWhere += ` AND (CASE 
            WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Closed 2"::date 
          END) <= $${queryParamsCerrados.length}::date`;
          
          rendimientoWhere += ` AND (CASE 
            WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Inicio del intervalo"::date 
          END) <= $${queryParamsRendimiento.length}::date`;

          qaWhere += ` AND (CASE 
            WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Marca temporal"::date 
          END) <= $${queryParamsQA.length}::date`;

          queryParamsAunAbiertos.push(endDate);
          aunAbiertosWhere += ` AND "fecha_en_que_esta_abierto"::date <= $${queryParamsAunAbiertos.length}::date`;
        }
      }

      // 1. Count from Abiertos
      const abiertosQuery = `SELECT COUNT(*) FROM "Abiertos" ${abiertosWhere}`;
      console.log(`Querying Abiertos: ${abiertosQuery} with params ${queryParamsAbiertos}`);
      const abiertosRes = await pool.query(abiertosQuery, queryParamsAbiertos);
      const abiertosCount = parseInt(abiertosRes.rows[0].count);

      // 1.05 Count from Abiertos where "Contact Reason Area" = 'Parts'
      const partsWhere = abiertosWhere + ' AND TRIM("Contact Reason Area") = \'Parts\'';
      const partsQuery = `SELECT COUNT(*) FROM "Abiertos" ${partsWhere}`;
      console.log(`Querying Parts: ${partsQuery} with params ${queryParamsAbiertos}`);
      const partsRes = await pool.query(partsQuery, queryParamsAbiertos);
      const partsCount = parseInt(partsRes.rows[0].count);
      const partsPercentage = abiertosCount > 0 ? (partsCount / abiertosCount) * 100 : 0;

      // 1.1 Count from Cerrados
      const cerradosQuery = `SELECT COUNT(*) FROM "Cerrados" ${cerradosWhere}`;
      console.log(`Querying Cerrados: ${cerradosQuery} with params ${queryParamsCerrados}`);
      const cerradosRes = await pool.query(cerradosQuery, queryParamsCerrados);
      const cerradosCount = parseInt(cerradosRes.rows[0].count);

      // 1.2 Count from aun_abiertos (Only for the maximum selected date)
      let aunAbiertosCountQuery = '';
      let aunAbiertosCountParams: any[] = [];
      
      if (endDate) {
        aunAbiertosCountQuery = `SELECT COUNT(*) FROM "aun_abiertos" WHERE "fecha_en_que_esta_abierto"::date = $1::date`;
        aunAbiertosCountParams = [endDate];
      } else {
        aunAbiertosCountQuery = `SELECT COUNT(*) FROM "aun_abiertos" WHERE "fecha_en_que_esta_abierto"::date = (SELECT MAX("fecha_en_que_esta_abierto"::date) FROM "aun_abiertos")`;
      }
      
      console.log(`Querying Still Open Cases (Indicator): ${aunAbiertosCountQuery} with params ${aunAbiertosCountParams}`);
      const aunAbiertosRes = await pool.query(aunAbiertosCountQuery, aunAbiertosCountParams);
      const aunAbiertosCount = parseInt(aunAbiertosRes.rows[0].count);

      // 1.3 Calculate Backlog Metric
      // Formula: (Still Open Cases) / (Average of Opened Cases from the last 3 full months)
      // "Opened Cases" here refers to total records in "Abiertos" (no case owner filter)
      let backlog = 0;
      try {
        let refDate: Date;
        if (endDate) {
          refDate = new Date(endDate as string);
        } else {
          const maxDateRes = await pool.query(`SELECT MAX("fecha_en_que_esta_abierto"::date) as max_date FROM "aun_abiertos"`);
          refDate = maxDateRes.rows[0].max_date ? new Date(maxDateRes.rows[0].max_date) : new Date();
        }

        // Calculate the 3 full months before refDate
        // Example: refDate = 2026-01-31 -> Months: Dec, Nov, Oct
        const firstDayOfCurrentMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        const lookbackEnd = new Date(firstDayOfCurrentMonth.getTime() - 1); // Last day of previous month
        const lookbackStart = new Date(refDate.getFullYear(), refDate.getMonth() - 3, 1); // First day of 3 months ago

        const lookbackStartStr = lookbackStart.toISOString().split('T')[0];
        const lookbackEndStr = lookbackEnd.toISOString().split('T')[0];

        const backlogOpenedQuery = `
          SELECT COUNT(*) 
          FROM "Abiertos" 
          WHERE (CASE 
            WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Opened 2"::date 
          END) BETWEEN $1::date AND $2::date
        `;
        
        const backlogOpenedRes = await pool.query(backlogOpenedQuery, [lookbackStartStr, lookbackEndStr]);
        const totalOpenedInLookback = parseInt(backlogOpenedRes.rows[0].count);
        const averageOpened = totalOpenedInLookback / 3;

        if (averageOpened > 0) {
          backlog = aunAbiertosCount / averageOpened;
        }
        console.log(`Backlog Calculation: refDate=${refDate.toISOString()}, lookback=${lookbackStartStr} to ${lookbackEndStr}, totalOpened=${totalOpenedInLookback}, avg=${averageOpened}, backlog=${backlog}`);
      } catch (err) {
        console.error("Error calculating backlog metric:", err);
      }

      // 2. Sum from Rendimiento_agente
      const rendimientoQuery = `
        SELECT 
          SUM("Contestadas") as total_contestadas, 
          SUM("Manejo" - "Contestadas") as total_manejo 
        FROM "Rendimiento_agente" 
        ${rendimientoWhere}
      `;
      console.log(`Querying Rendimiento_agente: ${rendimientoQuery} with params ${queryParamsRendimiento}`);
      const rendimientoRes = await pool.query(rendimientoQuery, queryParamsRendimiento);

      // 2.1 QA Data from QA_MX
      let qaScore = 0;
      const qaScoreFormula = `
        (
          (CASE WHEN TRIM(COALESCE("Cultivar la Reputación y Lealtad de Stellantis", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Lenguaje y Tono", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Empatía", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Escucha Activa / Confirmación", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Asegurar", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Documentación", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Tipificación de Casos", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Verificación", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Cumplimiento de Procesos", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) +
          (CASE WHEN TRIM(COALESCE("Toma de Decisiones / Pensamiento Crítico (Incluidos Recursos Correctos)", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END)
        ) * (CASE WHEN TRIM(COALESCE("Error Crítico", '')) ILIKE 'NA' OR TRIM(COALESCE("Error Crítico", '')) ILIKE 'N/A' OR TRIM(COALESCE("Error Crítico", '')) = '' THEN 1 ELSE 0 END)
      `;

      if (qaList.length > 0) {
        const qaQuery = `SELECT AVG(${qaScoreFormula}) as avg_score FROM "QA_MX" ${qaWhere}`;
        console.log(`Querying QA_MX: ${qaQuery} with params ${queryParamsQA}`);
        const qaRes = await pool.query(qaQuery, queryParamsQA);
        qaScore = parseFloat(qaRes.rows[0].avg_score || 0);
      }
      
      // 3. Time-series data for chart
      const abiertosTimeSeriesQuery = `
        SELECT 
          (CASE 
            WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Opened 2"::date 
          END) as date,
          COUNT(*) as count
        FROM "Abiertos"
        ${abiertosWhere}
        GROUP BY date
        ORDER BY date
      `;
      const cerradosTimeSeriesQuery = `
        SELECT 
          (CASE 
            WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Date Closed 2"::date 
          END) as date,
          COUNT(*) as count
        FROM "Cerrados"
        ${cerradosWhere}
        GROUP BY date
        ORDER BY date
      `;

      const rendimientoTimeSeriesQuery = `
        SELECT 
          (CASE 
            WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Inicio del intervalo"::date 
          END) as date,
          SUM("Contestadas") as incoming,
          SUM("Manejo" - "Contestadas") as outgoing
        FROM "Rendimiento_agente"
        ${rendimientoWhere}
        GROUP BY date
        ORDER BY date
      `;

      const qaTimeSeriesQuery = `
        SELECT 
          (CASE 
            WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' 
            THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') 
            ELSE "Marca temporal"::date 
          END) as date,
          AVG(${qaScoreFormula}) as avg_score
        FROM "QA_MX"
        ${qaWhere}
        GROUP BY date
        ORDER BY date
      `;
      
      const aunAbiertosTimeSeriesQuery = `
        SELECT 
          "fecha_en_que_esta_abierto"::date as date,
          COUNT(*) as count
        FROM "aun_abiertos"
        ${aunAbiertosWhere}
        GROUP BY date
        ORDER BY date
      `;

      const [abiertosTS, cerradosTS, rendimientoTS, qaTS, aunAbiertosTS] = await Promise.all([
        pool.query(abiertosTimeSeriesQuery, queryParamsAbiertos),
        pool.query(cerradosTimeSeriesQuery, queryParamsCerrados),
        pool.query(rendimientoTimeSeriesQuery, queryParamsRendimiento),
        qaList.length > 0 ? pool.query(qaTimeSeriesQuery, queryParamsQA) : Promise.resolve({ rows: [] }),
        pool.query(aunAbiertosTimeSeriesQuery, queryParamsAunAbiertos)
      ]);

      // Merge time-series data
      const dateMap: Record<string, { date: string; open: number; closed: number; aunAbiertos: number; incoming: number; outgoing: number; qa?: number }> = {};
      
      abiertosTS.rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
        dateMap[dateStr].open = parseInt(row.count || 0);
      });
 
      cerradosTS.rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
        dateMap[dateStr].closed = parseInt(row.count || 0);
      });
 
      aunAbiertosTS.rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
        dateMap[dateStr].aunAbiertos = parseInt(row.count || 0);
      });
 
      rendimientoTS.rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
        dateMap[dateStr].incoming = parseFloat(row.incoming || 0);
        dateMap[dateStr].outgoing = parseFloat(row.outgoing || 0);
      });
 
      qaTS.rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0, qa: 0 };
        dateMap[dateStr].qa = parseFloat(row.avg_score || 0);
      });

      const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

      const indicators = {
        abiertos: abiertosCount,
        cerrados: cerradosCount,
        aunAbiertos: aunAbiertosCount,
        backlog: backlog,
        partsPercentage: partsPercentage,
        contestadas: parseFloat(rendimientoRes.rows[0]?.total_contestadas || 0),
        manejo: parseFloat(rendimientoRes.rows[0]?.total_manejo || 0),
        qa: qaScore !== null ? qaScore : 0,
        chartData
      };

      res.json(indicators);
    } catch (error) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ error: "Error fetching database indicators" });
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
