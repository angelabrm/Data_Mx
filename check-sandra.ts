import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkSandraData() {
  try {
    const res = await pool.query("SELECT * FROM \"Abiertos\" WHERE \"Case Owner\" = 'Sandra Perez' LIMIT 5");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSandraData();
