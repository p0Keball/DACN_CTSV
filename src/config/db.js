const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Bắt buộc khi kết nối với Supabase/Neon
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Lỗi kết nối PostgreSQL:', err.stack);
  }
  console.log('✅ Kết nối thành công tới PostgreSQL Online!');
  release();
});

module.exports = pool;