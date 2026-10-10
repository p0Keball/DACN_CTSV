// backend/src/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const pool = require('./config/db'); // File kết nối PostgreSQL Supabase
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const app = express();
app.use(cors());
app.use(express.json());

// === ĐĂNG NHẬP ADMIN (Gói 7: 1 tài khoản duy nhất, không đăng ký) ===
// GET mở để xem/báo cáo; mọi POST/PUT/PATCH/DELETE đều cần Bearer token.
const requireAuth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn' });
  }
};
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.path === '/auth/login') return next();
  return requireAuth(req, res, next);
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, data: { token, username: user.username, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ success: true, data: { username: req.user.username, role: req.user.role } });
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục 'uploads' nếu chưa tồn tại để chứa file PDF/Word
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer để đổi tên file tránh trùng lặp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'))
});
// Chặn file quá to / sai loại ngay từ upload (đỡ sập server vì 1 file phim)
const ALLOWED_UPLOAD = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|jpg|jpeg|png|gif|zip|rar)$/i;
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (ALLOWED_UPLOAD.test(name)) return cb(null, true);
    cb(new Error('Chỉ nhận file PDF/Office/ảnh/zip dưới 20MB'));
  },
});

// Mở public thư mục uploads để Frontend có thể click vào xem/tải file
app.use('/uploads', express.static(uploadDir));

// API đồng bộ sinh viên từ DLU Proxy
app.post('/api/students/sync', async (req, res) => {
  const { classId } = req.body;

  if (!classId || classId === 'all') {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn một mã lớp cụ thể.' });
  }

  // 1. In ra Terminal để kiểm tra xem Backend đã đọc được API Key chưa

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

// 2. API lấy thống kê tổng quan số lượng công việc
// Status chuẩn (§3.1): Mới tạo / Đã soạn / Đã gửi / Chờ phản hồi / Đang xử lý / Kết thúc / Quá hạn
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('Mới', 'Mới tạo', 'Đang xử lý', 'Đã soạn', 'Đã gửi', 'Chờ phản hồi')) AS processing,
        COUNT(*) FILTER (
          WHERE status != 'Kết thúc' 
          AND deadline::date >= CURRENT_DATE 
          AND deadline::date <= CURRENT_DATE + INTERVAL '3 days'
        ) AS pending,
        COUNT(*) FILTER (
          WHERE status != 'Kết thúc' 
          AND deadline::date < CURRENT_DATE
        ) AS overdue,
        COUNT(*) FILTER (WHERE status = 'Kết thúc') AS completed
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
      SELECT c.class_code, c.class_name, c.teacher_id, c.email, t.full_name AS teacher_name
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
    await pool.query('INSERT INTO classes (class_code, class_name, email) VALUES ($1, $2, $3)',
      [req.body.class_code, req.body.class_name || `Lớp ${req.body.class_code}`, req.body.email || null]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.put('/api/classes/:class_code', async (req, res) => {
  try {
    // COALESCE để caller cũ (chỉ gửi class_name) không xóa mất email
    await pool.query(
      'UPDATE classes SET class_name = COALESCE($1, class_name), email = COALESCE($2, email) WHERE class_code = $3',
      [req.body.class_name || null, req.body.email || null, req.params.class_code]
    );
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

// Lấy 1 công việc (trang Sửa dùng — khỏi tải hết danh sách về tìm 1 cái)
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  const { title, content, deadline, priority, status, source, semester, task_type, ref_doc_number, ref_issue_date, remind_before_days } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, content, deadline, priority, status, source, semester, task_type, ref_doc_number, ref_issue_date, remind_before_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [title, content, deadline, priority || 'Bình thường', status || 'Mới tạo', source || 'Thủ công', semester, task_type || 'ThongBaoDon', ref_doc_number || null, ref_issue_date || null, remind_before_days ?? 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { title, content, deadline, priority, status, source, semester, task_type, ref_doc_number, ref_issue_date, remind_before_days } = req.body;
  try {
    await pool.query(
      `UPDATE tasks SET title=$1, content=$2, deadline=$3, priority=$4, status=$5, source=$6, semester=$7,
        task_type=COALESCE($8, task_type), ref_doc_number=$9, ref_issue_date=$10,
        remind_before_days=COALESCE($11, remind_before_days), updated_at=CURRENT_TIMESTAMP WHERE id=$12`,
      [title, content, deadline, priority, status, source, semester, task_type || null, ref_doc_number || null, ref_issue_date || null, remind_before_days ?? null, req.params.id]
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

// === QUẢN LÝ TẬP TIN ĐÍNH KÈM (TASK ATTACHMENTS) ===
// 1. Lấy danh sách file đính kèm của 1 công việc
app.get('/api/tasks/:taskId/attachments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_attachments WHERE task_id = $1', [req.params.taskId]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 2. Lưu Link Google Docs / Trang tính
app.post('/api/tasks/:taskId/attachments/link', async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO task_attachments (task_id, file_name, file_url, file_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.taskId, 'Đường dẫn Tài liệu / Trang tính (Google Drive)', req.body.file_url, 'link']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 3. Upload File (PDF, Word) lưu vào local máy
app.post('/api/tasks/:taskId/attachments/file', upload.array('files'), async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const attachments = [];
    
    for (const file of req.files) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      const result = await pool.query(
        'INSERT INTO task_attachments (task_id, file_name, file_url, file_size, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [taskId, Buffer.from(file.originalname, 'latin1').toString('utf8'), fileUrl, file.size.toString(), file.mimetype]
      );
      attachments.push(result.rows[0]);
    }
    res.json({ success: true, data: attachments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 4. Xóa file đính kèm
app.delete('/api/attachments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM task_attachments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === NGƯỜI NHẬN EMAIL THẬT (§3.1: khác "Nơi nhận" của eOffice) ===
// task_recipients.kind: 'to' (mặc định) | 'cc' — cụm Cc ban lãnh đạo
app.get('/api/tasks/:taskId/recipients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_recipients WHERE task_id = $1 ORDER BY id', [req.params.taskId]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/tasks/:taskId/recipients', async (req, res) => {
  const { recipient_email, recipient_name, recipient_group, kind } = req.body;
  if (!recipient_email) return res.status(400).json({ success: false, message: 'Thiếu email người nhận' });
  try {
    const result = await pool.query(
      'INSERT INTO task_recipients (task_id, recipient_email, recipient_name, recipient_group, kind) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.taskId, recipient_email, recipient_name || null, recipient_group || null, kind === 'cc' ? 'cc' : 'to']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/recipients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM task_recipients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === DANH BẠ CC (ban lãnh đạo — nguồn cụm Cc, sửa trong popup Danh bạ) ===
app.get('/api/cc-contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cc_contacts ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/cc-contacts', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email || !email.includes('@')) return res.status(400).json({ success: false, message: 'Thiếu tên hoặc email hợp lệ' });
  try {
    const result = await pool.query(
      'INSERT INTO cc_contacts (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/cc-contacts/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE cc_contacts SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3',
      [req.body.name || null, req.body.email || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/cc-contacts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cc_contacts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === LỊCH SỬ GỬI (§3.1 LichSuGui — dùng bảng email_reminders) ===
app.get('/api/tasks/:taskId/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_reminders WHERE task_id = $1 ORDER BY created_at DESC', [req.params.taskId]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === GỬI EMAIL (giai đoạn hiện tại: ghi log "Đã gửi", chưa gửi SMTP thật) ===
app.post('/api/tasks/:taskId/send', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy công việc' });
    const task = taskRes.rows[0];
    const recipRes = await pool.query('SELECT * FROM task_recipients WHERE task_id = $1', [taskId]);
    if (recipRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Chưa có người nhận nào. Hãy thêm người nhận trước khi gửi.' });

    const sendType = req.body.send_type || 'Gửi lần đầu';
    const logs = [];
    for (const r of recipRes.rows) {
      const result = await pool.query(
        `INSERT INTO email_reminders (task_id, recipient_email, recipient_type, subject, body_content, send_type, kind, scheduled_at, sent_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Đã gửi') RETURNING *`,
        [taskId, r.recipient_email, r.recipient_group || 'GVCN', task.title, task.content || '', sendType, r.kind || 'to']
      );
      logs.push(result.rows[0]);
    }
    await pool.query(`UPDATE tasks SET status='Đã gửi', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [taskId]);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === PHÂN CÔNG SINH VIÊN (tái dùng bảng task_assignments) ===
// Quy ước status: Được phân công (mặc định) → Đã xác nhận → Đã tham gia / Vắng
const PARTICIPANT_STATUSES = ['Được phân công', 'Đã xác nhận', 'Đã tham gia', 'Vắng'];

// Lấy danh sách SV được phân công của 1 công việc (kèm tên/lớp từ bảng students)
app.get('/api/tasks/:taskId/participants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.id, ta.task_id, ta.student_id, ta.class_code, ta.status, ta.note, ta.created_at,
              s.first_name AS "FirstName", s.last_name AS "LastName", s.class_id AS "ClassStudentID",
              s.gender AS "Gender", s.role_id AS "ClassRoleID"
       FROM task_assignments ta
       LEFT JOIN students s ON s.student_id = ta.student_id
       WHERE ta.task_id = $1
       ORDER BY ta.class_code, ta.student_id`,
      [req.params.taskId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Thêm hàng loạt SV vào 1 công việc (idempotent nhờ UNIQUE(task_id, student_id))
app.post('/api/tasks/:taskId/participants', async (req, res) => {
  const { student_ids } = req.body;
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'student_ids phải là mảng MSSV không rỗng' });
  }
  try {
    const taskId = req.params.taskId;
    const ids = [...new Set(student_ids.map(String))];
    // Lấy class_code từ bảng students để khỏi bắt client gửi kèm
    const stRes = await pool.query('SELECT student_id, class_id FROM students WHERE student_id = ANY($1)', [ids]);
    const classById = Object.fromEntries(stRes.rows.map(r => [r.student_id, r.class_id]));
    const rows = [];
    for (const sid of ids) {
      const result = await pool.query(
        `INSERT INTO task_assignments (task_id, student_id, class_code, status)
         VALUES ($1, $2, $3, 'Được phân công')
         ON CONFLICT (task_id, student_id) DO NOTHING
         RETURNING *`,
        [taskId, sid, classById[sid] || null]
      );
      if (result.rows[0]) rows.push(result.rows[0]);
    }
    res.json({ success: true, data: rows, added: rows.length, skipped: ids.length - rows.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Cập nhật trạng thái / ghi chú phân công (điểm danh sau sự kiện)
app.patch('/api/participants/:id', async (req, res) => {
  const { status, note } = req.body;
  if (status !== undefined && !PARTICIPANT_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status phải thuộc: ${PARTICIPANT_STATUSES.join(', ')}` });
  }
  try {
    const result = await pool.query(
      `UPDATE task_assignments
       SET status = COALESCE($1, status), note = COALESCE($2, note)
       WHERE id = $3 RETURNING *`,
      [status || null, note !== undefined ? note : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy phân công' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/participants/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM task_assignments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === ĐIỂM DANH 1 SINH VIÊN (panel Hồ sơ SV): chỉ task đã Kết thúc ===
// Mỗi bản ghi task_assignments = 1 đơn vị điểm danh. Có mặt = 'Đã tham gia'.
app.get('/api/students/:id/attendance', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.id, ta.task_id, ta.status AS assignment_status, ta.note,
              t.title, t.deadline, t.status AS task_status, t.semester
       FROM task_assignments ta
       JOIN tasks t ON t.id = ta.task_id
       WHERE ta.student_id = $1 AND t.status = 'Kết thúc'
       ORDER BY t.deadline DESC NULLS LAST, t.id DESC`,
      [req.params.id]
    );
    const items = result.rows;
    const total = items.length;
    const attended = items.filter((r) => r.assignment_status === 'Đã tham gia').length;
    const absent = items.filter((r) => r.assignment_status === 'Vắng').length;
    res.json({ success: true, data: { total, attended, absent, items } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// === TỦ HỒ SƠ (tab Hồ sơ): gom file theo tháng tạo công việc ===
// File vào task_attachments (upload tay, link Drive, sau này sync eOffice)
// tự hiện ở đây — không cần ghi thêm chỗ nào khác.
// 1. Thư viện nhóm theo tháng (chỉ task có file)
app.get('/api/files/library', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT to_char(date_trunc('month', t.created_at), 'YYYY-MM') AS month,
              t.id, t.title, t.created_at, t.source,
              COUNT(a.id) AS file_count
       FROM tasks t
       JOIN task_attachments a ON a.task_id = t.id
       GROUP BY 1, t.id, t.title, t.created_at, t.source
       ORDER BY 1 DESC, t.created_at DESC, t.id DESC`
    );
    const months = [];
    for (const row of result.rows) {
      let m = months.find(x => x.month === row.month);
      if (!m) { m = { month: row.month, tasks: [] }; months.push(m); }
      m.tasks.push(row);
    }
    res.json({ success: true, data: months });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 2. Tìm file theo tên file / tên công việc (+ lọc loại, nguồn)
app.get('/api/files/search', async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const { type, source } = req.query;
  try {
    const conds = ['(a.file_name ILIKE $1 OR t.title ILIKE $1)'];
    const params = [q];
    if (type === 'pdf') conds.push(`(a.file_type ILIKE '%pdf%' OR a.file_name ILIKE '%.pdf')`);
    else if (type === 'word') conds.push(`(a.file_type ILIKE '%word%' OR a.file_name ILIKE '%.doc%')`);
    else if (type === 'excel') conds.push(`(a.file_type ILIKE '%sheet%' OR a.file_name ILIKE '%.xls%')`);
    else if (type === 'image') conds.push(`(a.file_type ILIKE 'image/%')`);
    else if (type === 'link') conds.push(`(a.file_type = 'link')`);
    if (source) { params.push(source); conds.push(`t.source = $${params.length}`); }
    const result = await pool.query(
      `SELECT a.id, a.file_name, a.file_url, a.file_type, a.file_size,
              t.id AS task_id, t.title AS task_title, t.created_at AS task_created, t.source
       FROM task_attachments a
       JOIN tasks t ON t.id = a.task_id
       WHERE ${conds.join(' AND ')}
       ORDER BY t.created_at DESC, a.id DESC
       LIMIT 100`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
// === BÁO CÁO TỔNG HỢP (Gói 6, chỉ đọc) ===
const REPORT_GROUPS = ['day', 'week', 'month', 'quarter', 'year'];

// 1. Công việc theo kỳ: group=day|week|month|quarter|year, from/to ISO (optional)
app.get('/api/reports/tasks', async (req, res) => {
  const group = REPORT_GROUPS.includes(String(req.query.group)) ? req.query.group : 'month';
  const { from, to } = req.query;
  try {
    const conds = ['deadline IS NOT NULL'];
    const params = [];
    if (from) { params.push(from); conds.push(`deadline >= $${params.length}`); }
    if (to) { params.push(to); conds.push(`deadline <= $${params.length}`); }
    const result = await pool.query(
      `SELECT to_char(date_trunc('${group}', deadline), 'YYYY-MM-DD') AS period,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'Kết thúc') AS completed,
              COUNT(*) FILTER (WHERE status != 'Kết thúc' AND deadline < CURRENT_TIMESTAMP) AS overdue,
              COUNT(*) FILTER (WHERE status != 'Kết thúc' AND deadline >= CURRENT_TIMESTAMP) AS processing
       FROM tasks
       WHERE ${conds.join(' AND ')}
       GROUP BY 1 ORDER BY 1`,
      params
    );
    res.json({ success: true, data: result.rows, group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 2. Học kỳ đang dùng (cho bộ lọc báo cáo rèn luyện)
app.get('/api/reports/semesters', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT semester FROM tasks WHERE semester IS NOT NULL AND semester != '' ORDER BY semester DESC`
    );
    res.json({ success: true, data: result.rows.map(r => r.semester) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 3. Thống kê rèn luyện: mỗi SV 1 dòng (join task_assignments + tasks)
// Lọc chung theo from/to (deadline) + semester (optional). Khi có bộ lọc thời gian/học kỳ,
// chỉ trả SV có phân công trong kỳ (HAVING assigned > 0); không lọc thì giữ hành vi cũ (sổ hết).
app.get('/api/reports/participation', async (req, res) => {
  const semester = req.query.semester || null;
  const classCode = req.query.class_code || null;
  const from = req.query.from || null;
  const to = req.query.to || null;
  const hasFilter = !!(semester || from || to);
  try {
    const conds = [];
    const params = [semester, from, to];
    if (classCode) {
      params.push(classCode);
      conds.push(`s.class_id = $${params.length}`);
    }
    const result = await pool.query(
      `SELECT s.student_id AS "StudentID",
              s.first_name AS "FirstName",
              s.last_name AS "LastName",
              s.class_id AS "ClassStudentID",
              COUNT(ta.id) AS assigned,
              COUNT(*) FILTER (WHERE ta.status = 'Đã tham gia') AS participated,
              COUNT(*) FILTER (WHERE ta.status = 'Vắng') AS absent
       FROM students s
       LEFT JOIN task_assignments ta ON ta.student_id = s.student_id
         AND EXISTS (
           SELECT 1 FROM tasks t WHERE t.id = ta.task_id
             AND ($1::text IS NULL OR t.semester = $1)
             AND ($2::date IS NULL OR t.deadline >= $2)
             AND ($3::date IS NULL OR t.deadline <= $3)
         )
       ${conds.length ? `WHERE ${conds.join(' AND ')}` : ''}
       GROUP BY s.student_id, s.first_name, s.last_name, s.class_id
       ${hasFilter ? 'HAVING COUNT(ta.id) > 0' : ''}
       ORDER BY s.class_id, s.student_id`,
      params
    );
    res.json({ success: true, data: result.rows, semester, from, to });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 4. Thống kê rèn luyện gom theo lớp: mỗi lớp 1 dòng (view chính tab Báo cáo).
// Cùng bộ lọc from/to + semester như mục 3; có lọc thì ẩn lớp assigned = 0.
app.get('/api/reports/participation-by-class', async (req, res) => {
  const semester = req.query.semester || null;
  const from = req.query.from || null;
  const to = req.query.to || null;
  const hasFilter = !!(semester || from || to);
  try {
    const result = await pool.query(
      `SELECT c.class_code AS "ClassCode",
              c.class_name AS "ClassName",
              t.full_name AS "TeacherName",
              COUNT(DISTINCT s.student_id) AS total_students,
              COUNT(ta.id) AS assigned,
              COUNT(*) FILTER (WHERE ta.status = 'Đã tham gia') AS participated,
              COUNT(*) FILTER (WHERE ta.status = 'Vắng') AS absent
       FROM classes c
       LEFT JOIN teachers t ON t.id = c.teacher_id
       LEFT JOIN students s ON s.class_id = c.class_code
       LEFT JOIN task_assignments ta ON ta.student_id = s.student_id
         AND EXISTS (
           SELECT 1 FROM tasks k WHERE k.id = ta.task_id
             AND ($1::text IS NULL OR k.semester = $1)
             AND ($2::date IS NULL OR k.deadline >= $2)
             AND ($3::date IS NULL OR k.deadline <= $3)
         )
       GROUP BY c.class_code, c.class_name, t.full_name
       ${hasFilter ? 'HAVING COUNT(ta.id) > 0' : ''}
       ORDER BY c.class_code`,
      [semester, from, to]
    );
    res.json({ success: true, data: result.rows, semester, from, to });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// 5. Hiệu suất công việc trong khoảng thời gian: mỗi việc 1 dòng kèm điểm.
// Điểm việc i: status 'Kết thúc' thì participated/assigned, ngược lại 0.
// Hiệu suất kỳ = SUM(điểm) / tổng số việc.
app.get('/api/reports/performance', async (req, res) => {
  const from = req.query.from || null;
  const to = req.query.to || null;
  const semester = req.query.semester || null;
  try {
    const conds = ['t.deadline IS NOT NULL'];
    const params = [];
    if (from) { params.push(from); conds.push(`t.deadline >= $${params.length}`); }
    if (to) { params.push(to); conds.push(`t.deadline <= $${params.length}`); }
    if (semester) { params.push(semester); conds.push(`t.semester = $${params.length}`); }
    const result = await pool.query(
      `SELECT t.id, t.title, t.deadline, t.status, t.semester,
              COUNT(ta.id) AS assigned,
              COUNT(*) FILTER (WHERE ta.status = 'Đã tham gia') AS participated
       FROM tasks t
       LEFT JOIN task_assignments ta ON ta.task_id = t.id
       WHERE ${conds.join(' AND ')}
       GROUP BY t.id, t.title, t.deadline, t.status, t.semester
       ORDER BY t.deadline`,
      params
    );
    const tasks = result.rows.map((r) => {
      const assigned = Number(r.assigned) || 0;
      const participated = Number(r.participated) || 0;
      const score = r.status === 'Kết thúc' && assigned > 0 ? participated / assigned : 0;
      return { ...r, assigned, participated, score: Math.round(score * 1000) / 1000 };
    });
    const total = tasks.length;
    const totalScore = tasks.reduce((s, r) => s + r.score, 0);
    const performance = total === 0 ? 0 : Math.round((totalScore / total) * 1000) / 10;
    res.json({ success: true, data: { tasks, summary: { total, totalScore: Math.round(totalScore * 1000) / 1000, performance } }, from, to, semester });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});



// Lỗi upload (sai loại/quá 20MB) trả JSON thay vì HTML mặc định của Express
app.use((err, req, res, next) => {
  if (!err) return next();
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá 20MB' : (err.message || 'Lỗi upload file');
  res.status(400).json({ success: false, message: msg });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Backend running on http://localhost:${PORT}`));