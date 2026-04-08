export default async function handler(req, res) {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      googleSheets: 'unknown',
      gemini: 'unknown'
    }
  };

  try {
    // Check Database
    const pool = (await import('./_lib/db.js')).default;
    await pool.query('SELECT 1');
    healthCheck.services.database = 'connected';
  } catch (error) {
    healthCheck.services.database = `error: ${error.message}`;
    healthCheck.status = 'error';
  }

  try {
    // Check Google Sheets
    const sheets = (await import('./_lib/google.js')).default;
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    healthCheck.services.googleSheets = 'connected';
  } catch (error) {
    healthCheck.services.googleSheets = `error: ${error.message}`;
    healthCheck.status = 'error';
  }

  try {
    // Check Gemini API Key
    if (process.env.GEMINI_API_KEY) {
      healthCheck.services.gemini = 'configured';
    } else {
      healthCheck.services.gemini = 'missing';
      healthCheck.status = 'error';
    }
  } catch (error) {
    healthCheck.services.gemini = `error: ${error.message}`;
    healthCheck.status = 'error';
  }

  res.status(healthCheck.status === 'ok' ? 200 : 500).json(healthCheck);
}
