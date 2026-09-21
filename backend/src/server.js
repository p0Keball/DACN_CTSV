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

    await pool.query(
      `INSERT INTO classes (class_code, class_name) VALUES ($1, $2) ON CONFLICT (class_code) DO NOTHING`,
      [classId, `Lớp ${classId}`]
    );
    
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

// 1. API Lấy danh sách sinh viên từ Database (để load khi F5)
app.get('/api/students', async (req, res) => {
  try {
    // Dùng AS để đổi tên cột DB (snake_case) sang định dạng Frontend đang dùng (PascalCase)
    const query = `
      SELECT 
        student_id AS "StudentID", 
        first_name AS "FirstName", 
        last_name AS "LastName", 
        class_id AS "ClassStudentID", 
        birth_day AS "BirthDay", 
        gender AS "Gender", 
        role_id AS "ClassRoleID", 
        birth_place AS "BirthPlace", 
        permanent_residence AS "PermanentResidence", 
        study_program_id AS "StudyProgramID", 
        is_in_class AS "IsInClass",
        email, 
        phone
      FROM students
      ORDER BY class_id, student_id;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách sinh viên:", err.message);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu sinh viên' });
  }
});

// --- API QUẢN LÝ GIẢNG VIÊN ---
app.get('/api/teachers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teachers ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  const { full_name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO teachers (full_name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [full_name, email, phone]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- API QUẢN LÝ LỚP & PHÂN CÔNG GVCN ---
app.get('/api/classes', async (req, res) => {
  try {
    const query = `
      SELECT c.class_code, c.class_name, c.teacher_id, t.full_name AS teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.class_code
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/classes/:class_code/assign', async (req, res) => {
  const { class_code } = req.params;
  const { teacher_id } = req.body;
  try {
    await pool.query('UPDATE classes SET teacher_id = $1 WHERE class_code = $2', [teacher_id, class_code]);
    res.json({ success: true, message: 'Phân công thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === CRUD GIẢNG VIÊN ===
app.put('/api/teachers/:id', async (req, res) => {
  try {
    await pool.query('UPDATE teachers SET full_name=$1, email=$2, phone=$3 WHERE id=$4', [req.body.full_name, req.body.email, req.body.phone, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.delete('/api/teachers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teachers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === CRUD LỚP HỌC ===
app.post('/api/classes', async (req, res) => {
  try {
    await pool.query('INSERT INTO classes (class_code, class_name) VALUES ($1, $2)', [req.body.class_code, req.body.class_name]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.put('/api/classes/:class_code', async (req, res) => {
  try {
    await pool.query('UPDATE classes SET class_name=$1 WHERE class_code=$2', [req.body.class_name, req.params.class_code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.delete('/api/classes/:class_code', async (req, res) => {
  try {
    await pool.query('DELETE FROM classes WHERE class_code=$1', [req.params.class_code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === CRUD SINH VIÊN (Thủ công) ===
app.post('/api/students', async (req, res) => {
  const { StudentID, FirstName, LastName, ClassStudentID, BirthDay, Gender, ClassRoleID } = req.body;
  try {
    await pool.query(
      `INSERT INTO students (student_id, first_name, last_name, class_id, birth_day, gender, role_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [StudentID, FirstName, LastName, ClassStudentID, BirthDay, Gender, ClassRoleID || 0]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.put('/api/students/:id', async (req, res) => {
  const { FirstName, LastName, ClassStudentID, BirthDay, Gender, ClassRoleID } = req.body;
  try {
    await pool.query(
      `UPDATE students SET first_name=$1, last_name=$2, class_id=$3, birth_day=$4, gender=$5, role_id=$6 WHERE student_id=$7`,
      [FirstName, LastName, ClassStudentID, BirthDay, Gender, ClassRoleID || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE student_id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === CRUD CÔNG VIỆC (TASKS) ===
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY deadline ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  const { title, content, deadline, priority, status, source, semester } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, content, deadline, priority, status, source, semester) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, content, deadline, priority || 'Bình thường', status || 'Mới', source || 'Thủ công', semester]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { title, content, deadline, priority, status, source, semester } = req.body;
  try {
    await pool.query(
      'UPDATE tasks SET title=$1, content=$2, deadline=$3, priority=$4, status=$5, source=$6, semester=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8',
      [title, content, deadline, priority, status, source, semester, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Backend running on http://localhost:${PORT}`));