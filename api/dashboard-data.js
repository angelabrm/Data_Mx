import pool from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rfc, compass, genesys, qa, startDate, endDate, vistaDash } = req.query;

  if (!rfc || !compass || !genesys) {
    return res.status(400).json({ error: "Missing parameters (rfc, compass, or genesys)" });
  }

  try {
    const compassList = String(compass).split(',').map(s => s.trim());
    const genesysList = String(genesys).split(',').map(s => s.trim());
    const qaList = String(qa || "").split(',').map(s => s.trim()).filter(Boolean).filter(s => s.toLowerCase() !== 'none');

    let abiertosWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Case Owner")) = ANY($1)';
    let cerradosWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Case Closed By")) = ANY($1)';
    let rendimientoWhere = compassList.some(s => s.toLowerCase() === 'none') ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Nombre del agente")) = ANY($1)';
    let qaWhere = qaList.length === 0 ? 'WHERE 1=1' : 'WHERE LOWER(TRIM("Agente")) = ANY($1)';
    let aunAbiertosWhere = 'WHERE 1=1';
    
    const queryParamsAbiertos = [compassList.map(s => s.toLowerCase())];
    const queryParamsCerrados = [compassList.map(s => s.toLowerCase())];
    const queryParamsRendimiento = [compassList.map(s => s.toLowerCase())]; 
    const queryParamsQA = [qaList.map(s => s.toLowerCase())];
    const queryParamsAunAbiertos = [];

    if (startDate || endDate) {
      if (startDate) {
        queryParamsAbiertos.push(startDate);
        queryParamsCerrados.push(startDate);
        queryParamsRendimiento.push(startDate);
        queryParamsQA.push(startDate);
        
        abiertosWhere += ` AND (CASE WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Opened 2"::date END) >= $${queryParamsAbiertos.length}::date`;
        cerradosWhere += ` AND (CASE WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Closed 2"::date END) >= $${queryParamsCerrados.length}::date`;
        rendimientoWhere += ` AND (CASE WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Inicio del intervalo"::date END) >= $${queryParamsRendimiento.length}::date`;
        qaWhere += ` AND (CASE WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Marca temporal"::date END) >= $${queryParamsQA.length}::date`;
        queryParamsAunAbiertos.push(startDate);
        aunAbiertosWhere += ` AND "fecha_en_que_esta_abierto"::date >= $${queryParamsAunAbiertos.length}::date`;
      }
      
      if (endDate) {
        queryParamsAbiertos.push(endDate);
        queryParamsCerrados.push(endDate);
        queryParamsRendimiento.push(endDate);
        queryParamsQA.push(endDate);
        
        abiertosWhere += ` AND (CASE WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Opened 2"::date END) <= $${queryParamsAbiertos.length}::date`;
        cerradosWhere += ` AND (CASE WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Closed 2"::date END) <= $${queryParamsCerrados.length}::date`;
        rendimientoWhere += ` AND (CASE WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Inicio del intervalo"::date END) <= $${queryParamsRendimiento.length}::date`;
        qaWhere += ` AND (CASE WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Marca temporal"::date END) <= $${queryParamsQA.length}::date`;
        queryParamsAunAbiertos.push(endDate);
        aunAbiertosWhere += ` AND "fecha_en_que_esta_abierto"::date <= $${queryParamsAunAbiertos.length}::date`;
      }
    }

    const abiertosQuery = `SELECT COUNT(*) FROM "Abiertos" ${abiertosWhere}`;
    const abiertosRes = await pool.query(abiertosQuery, queryParamsAbiertos);
    const abiertosCount = parseInt(abiertosRes.rows[0].count);

    const partsWhere = abiertosWhere + ' AND TRIM("Contact Reason Area") = \'Parts\'';
    const partsQuery = `SELECT COUNT(*) FROM "Abiertos" ${partsWhere}`;
    const partsRes = await pool.query(partsQuery, queryParamsAbiertos);
    const partsCount = parseInt(partsRes.rows[0].count);
    const partsPercentage = abiertosCount > 0 ? (partsCount / abiertosCount) * 100 : 0;

    const cerradosQuery = `SELECT COUNT(*) FROM "Cerrados" ${cerradosWhere}`;
    const cerradosRes = await pool.query(cerradosQuery, queryParamsCerrados);
    const cerradosCount = parseInt(cerradosRes.rows[0].count);

    let aunAbiertosCountQuery = '';
    let aunAbiertosCountParams = [];
    if (endDate) {
      aunAbiertosCountQuery = `SELECT COUNT(*) FROM "aun_abiertos" WHERE "fecha_en_que_esta_abierto"::date = $1::date`;
      aunAbiertosCountParams = [endDate];
    } else {
      aunAbiertosCountQuery = `SELECT COUNT(*) FROM "aun_abiertos" WHERE "fecha_en_que_esta_abierto"::date = (SELECT MAX("fecha_en_que_esta_abierto"::date) FROM "aun_abiertos")`;
    }
    const aunAbiertosRes = await pool.query(aunAbiertosCountQuery, aunAbiertosCountParams);
    const aunAbiertosCount = parseInt(aunAbiertosRes.rows[0].count);

    let backlog = 0;
    try {
      let refDate;
      if (endDate) {
        refDate = new Date(endDate);
      } else {
        const maxDateRes = await pool.query(`SELECT MAX("fecha_en_que_esta_abierto"::date) as max_date FROM "aun_abiertos"`);
        refDate = maxDateRes.rows[0].max_date ? new Date(maxDateRes.rows[0].max_date) : new Date();
      }
      const firstDayOfCurrentMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const lookbackEnd = new Date(firstDayOfCurrentMonth.getTime() - 1);
      const lookbackStart = new Date(refDate.getFullYear(), refDate.getMonth() - 3, 1);
      const lookbackStartStr = lookbackStart.toISOString().split('T')[0];
      const lookbackEndStr = lookbackEnd.toISOString().split('T')[0];
      const backlogOpenedQuery = `SELECT COUNT(*) FROM "Abiertos" WHERE (CASE WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Opened 2"::date END) BETWEEN $1::date AND $2::date`;
      const backlogOpenedRes = await pool.query(backlogOpenedQuery, [lookbackStartStr, lookbackEndStr]);
      const totalOpenedInLookback = parseInt(backlogOpenedRes.rows[0].count);
      const averageOpened = totalOpenedInLookback / 3;
      if (averageOpened > 0) backlog = aunAbiertosCount / averageOpened;
    } catch (err) { console.error("Backlog error:", err); }

    const rendimientoQuery = `SELECT SUM("Contestadas") as total_contestadas, SUM("Manejo" - "Contestadas") as total_manejo FROM "Rendimiento_agente" ${rendimientoWhere}`;
    const rendimientoRes = await pool.query(rendimientoQuery, queryParamsRendimiento);

    let qaScore = 0;
    const qaScoreFormula = `((CASE WHEN TRIM(COALESCE("Cultivar la Reputación y Lealtad de Stellantis", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Lenguaje y Tono", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Empatía", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Escucha Activa / Confirmación", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Asegurar", '')) ILIKE 'Pulgar Arriba' THEN 16 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Documentación", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Tipificación de Casos", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Verificación", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Cumplimiento de Procesos", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END) + (CASE WHEN TRIM(COALESCE("Toma de Decisiones / Pensamiento Crítico (Incluidos Recursos Correctos)", '')) ILIKE 'Pulgar Arriba' THEN 4 ELSE 0 END)) * (CASE WHEN TRIM(COALESCE("Error Crítico", '')) ILIKE 'NA' OR TRIM(COALESCE("Error Crítico", '')) ILIKE 'N/A' OR TRIM(COALESCE("Error Crítico", '')) = '' THEN 1 ELSE 0 END)`;
    if (qaList.length > 0) {
      const qaQuery = `SELECT AVG(${qaScoreFormula}) as avg_score FROM "QA_MX" ${qaWhere}`;
      const qaRes = await pool.query(qaQuery, queryParamsQA);
      qaScore = parseFloat(qaRes.rows[0].avg_score || 0);
    }
    
    const chartQueries = [
      pool.query(`SELECT (CASE WHEN "Date Opened 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Opened 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Opened 2"::date END) as date, COUNT(*) as count FROM "Abiertos" ${abiertosWhere} GROUP BY date ORDER BY date`, queryParamsAbiertos),
      pool.query(`SELECT (CASE WHEN "Date Closed 2"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Date Closed 2"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Date Closed 2"::date END) as date, COUNT(*) as count FROM "Cerrados" ${cerradosWhere} GROUP BY date ORDER BY date`, queryParamsCerrados),
      pool.query(`SELECT (CASE WHEN "Inicio del intervalo"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Inicio del intervalo"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Inicio del intervalo"::date END) as date, SUM("Contestadas") as incoming, SUM("Manejo" - "Contestadas") as outgoing FROM "Rendimiento_agente" ${rendimientoWhere} GROUP BY date ORDER BY date`, queryParamsRendimiento),
      qaList.length > 0 ? pool.query(`SELECT (CASE WHEN "Marca temporal"::text ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(split_part(TRIM("Marca temporal"::text), ' ', 1), 'FMDD/FMMM/YYYY') ELSE "Marca temporal"::date END) as date, AVG(${qaScoreFormula}) as avg_score FROM "QA_MX" ${qaWhere} GROUP BY date ORDER BY date`, queryParamsQA) : Promise.resolve({ rows: [] }),
      pool.query(`SELECT "fecha_en_que_esta_abierto"::date as date, COUNT(*) as count FROM "aun_abiertos" ${aunAbiertosWhere} GROUP BY date ORDER BY date`, queryParamsAunAbiertos)
    ];

    const [abiertosTS, cerradosTS, rendimientoTS, qaTS, aunAbiertosTS] = await Promise.all(chartQueries);

    const dateMap = {};
    const processTS = (rows, key, valKey) => {
      rows.forEach(row => {
        const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
        dateMap[dateStr][key] = parseFloat(row[valKey] || 0);
      });
    };

    processTS(abiertosTS.rows, 'open', 'count');
    processTS(cerradosTS.rows, 'closed', 'count');
    processTS(aunAbiertosTS.rows, 'aunAbiertos', 'count');
    rendimientoTS.rows.forEach(row => {
      const dateStr = row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown';
      if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, open: 0, closed: 0, aunAbiertos: 0, incoming: 0, outgoing: 0 };
      dateMap[dateStr].incoming = parseFloat(row.incoming || 0);
      dateMap[dateStr].outgoing = parseFloat(row.outgoing || 0);
    });
    processTS(qaTS.rows, 'qa', 'avg_score');

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      abiertos: abiertosCount,
      cerrados: cerradosCount,
      aunAbiertos: aunAbiertosCount,
      backlog,
      partsPercentage,
      contestadas: parseFloat(rendimientoRes.rows[0]?.total_contestadas || 0),
      manejo: parseFloat(rendimientoRes.rows[0]?.total_manejo || 0),
      qa: qaScore,
      chartData
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({ error: "Error fetching database indicators" });
  }
}
