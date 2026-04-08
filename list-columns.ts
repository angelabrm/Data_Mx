import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function listColumns() {
  const tables = ['Cerrados', 'QA_MX', 'Abiertos', 'aun_abiertos', 'Rendimiento_agente'];
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`Table: ${table}`);
      console.log(res.rows);
    } catch (err) {
      console.error(`Error listing columns for ${table}:`, err);
    }
  }
  process.exit(0);
}

listColumns();
