// backend/src/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const pool = require('./config/db'); // File kết nối PostgreSQL Supabase

const app = express();
app.use(cors());
app.use(express.json());

// API đồng bộ sinh viên từ DLU Proxy
app.post('/api/students/sync', async (req, res) => {
  const { classId } = req.body;

  if (!classId || classId === 'all') {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn một mã lớp cụ thể.' });
  }

  // 1. In ra Terminal để kiểm tra xem Backend đã đọc được API Key chưa
  console.log("🔥 Đang kiểm tra API Key:", process.env.DLU_API_KEY ? "Đã nhận được Key" : "LỖI: Chưa có Key (Undefined)");
  console.log("🔥 Lớp cần đồng bộ:", classId);

  try {
    const response = await axios.post(
      'https://quan-ly-dao-tao-api.nguyentronghieu.io.vn/api/v1/LayDanhSachSinhVienTheoLop',
      { Id: classId }, // Payload truyền lên
      {
        headers: {
          'X-API-KEY': process.env.DLU_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const students = response.data.body || [];

    if (students.length === 0) {
      return res.json({ success: true, message: 'Không có dữ liệu sinh viên cho lớp này.', data: [] });
    }
    
    const queries = students.map(student => {
      const query = `
        INSERT INTO students (
          student_id, first_name, last_name, class_id, birth_day, gender, 
          role_id, birth_place, permanent_residence, study_program_id, is_in_class
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (student_id) 
        DO UPDATE SET 
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          class_id = EXCLUDED.class_id,
          birth_day = EXCLUDED.birth_day,
          gender = EXCLUDED.gender,
          role_id = EXCLUDED.role_id,
          birth_place = EXCLUDED.birth_place,
          permanent_residence = EXCLUDED.permanent_residence,
          study_program_id = EXCLUDED.study_program_id,
          is_in_class = EXCLUDED.is_in_class,
          updated_at = CURRENT_TIMESTAMP;
      `;
      const values = [
        student.StudentID,
        student.FirstName,
        student.LastName,
        student.ClassStudentID,
        student.BirthDay,
        student.Gender,
        student.ClassRoleID,
        student.BirthPlace,
        student.PermanentResidence,
        student.StudyProgramID,
        student.IsInClass
      ];
      return pool.query(query, values);
    });

    // Chờ tất cả các lệnh INSERT hoàn tất
    await Promise.all(queries);

    console.log(`✅ Đã lưu/cập nhật thành công ${students.length} sinh viên lớp ${classId} vào Database!`);
    res.json({ success: true, data: students });
    
  } catch (err) {
    const errorDetails = err.response?.data || err.message;
    console.error("❌ Lỗi đồng bộ Database:", errorDetails);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu dữ liệu vào hệ thống', details: errorDetails });
  }
});

// 1. API lấy danh sách toàn bộ công việc
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. API lấy thống kê tổng quan số lượng công việc
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Đang xử lý') AS processing,
        COUNT(*) FILTER (WHERE status = 'Mới') AS pending,
        COUNT(*) FILTER (WHERE status = 'Quá hạn') AS overdue,
        COUNT(*) FILTER (WHERE status = 'Hoàn thành') AS completed
      FROM tasks;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Backend running on http://localhost:${PORT}`));