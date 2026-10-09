require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    // To bng nu cha cA3
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ('admin', $1, 'admin')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [passwordHash]);

    console.log('Ti khon admin `A `c kh?i to/c-p nh-t!');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (err) {
    console.error('L"i:', err);
  } finally {
    pool.end();
  }
}

setup();
