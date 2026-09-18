const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// API 1: Lấy danh sách tất cả công việc
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API 2: Lấy danh sách lớp và GVCN
app.get('/api/classes', async (req, res) => {
  try {
    const query = `
      SELECT c.class_code, c.class_name, t.full_name as teacher_name, t.email as teacher_email 
      FROM classes c 
      LEFT JOIN teachers t ON c.teacher_id = t.id
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));