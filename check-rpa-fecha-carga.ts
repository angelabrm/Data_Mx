import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkRpaFechaCarga() {
  try {
    const res = await pool.query("SELECT \"rpa_fecha_carga\" FROM \"Rendimiento_agente\" LIMIT 5");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRpaFechaCarga();
