import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkDateClosed2() {
  try {
    const res = await pool.query("SELECT \"Date Closed 2\" FROM \"Cerrados\" LIMIT 5");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDateClosed2();
