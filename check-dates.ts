import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkDateFormats() {
  try {
    console.log("Cerrados:");
    const res1 = await pool.query("SELECT \"Closed Date\" FROM \"Cerrados\" LIMIT 5");
    console.log(res1.rows);

    console.log("Rendimiento_agente:");
    const res2 = await pool.query("SELECT \"Fecha\" FROM \"Rendimiento_agente\" LIMIT 5");
    console.log(res2.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDateFormats();
