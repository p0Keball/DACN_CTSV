// Seed dữ liệu mẫu để test panel Điểm danh SV (chạy 1 lần, chạy lại được).
// Cách dùng: cd backend && node src/seed-attendance-sample.js
// Yêu cầu: backend/.env đã có DATABASE_URL, DB đã có ít nhất 1 sinh viên
// (nếu chưa: mở tab Sinh viên → chọn lớp → Đồng bộ).
require('dotenv').config();
const pool = require('./config/db');

async function main() {
  // 1. Lấy 2 SV thật để gán điểm danh
  const st = await pool.query(
    'SELECT student_id, first_name, last_name, class_id FROM students ORDER BY student_id LIMIT 2'
  );
  if (st.rows.length === 0) {
    console.error('❌ Bảng students đang trống. Hãy Đồng bộ sinh viên trước rồi chạy lại.');
    process.exit(1);
  }
  const sv1 = st.rows[0];
  const sv2 = st.rows[1] || null;
  console.log(`📌 Dùng SV1=${sv1.student_id} (${sv1.first_name} ${sv1.last_name})` + (sv2 ? `, SV2=${sv2.student_id}` : ' (chỉ có 1 SV trong DB)'));

  // 2. Dọn mẫu cũ (chạy lại không bị trùng) — CASCADE xóa luôn task_assignments
  await pool.query(`DELETE FROM tasks WHERE title LIKE 'TEST_DIEMDANH\\_%'`);
  console.log('🧹 Đã dọn mẫu TEST_DIEMDANH cũ (nếu có).');

  // 3. Tạo 3 task đã kết thúc + 1 task đang xử lý (đối chứng: không được hiện ở panel)
  const ins = await pool.query(
    `INSERT INTO tasks (title, content, deadline, priority, status, source, semester)
     VALUES
       ('TEST_DIEMDANH_01 Lễ khai giảng (mẫu test)', 'Task Hoàn thành để test điểm danh', NOW() - INTERVAL '10 days', 'Cao', 'Hoàn thành', 'Thủ công', 'HK1 2026-2027'),
       ('TEST_DIEMDANH_02 Họp lớp tháng 9 (mẫu test)', 'Task Hoàn thành để test điểm danh', NOW() - INTERVAL '5 days', 'Bình thường', 'Hoàn thành', 'Thủ công', 'HK1 2026-2027'),
       ('TEST_DIEMDANH_03 Ngoại khóa (mẫu test)', 'Task Kết thúc để test điểm danh', NOW() - INTERVAL '2 days', 'Bình thường', 'Kết thúc', 'Thủ công', 'HK1 2026-2027'),
       ('TEST_DIEMDANH_04 Chưa diễn ra (đối chứng)', 'Task Đang xử lý — panel điểm danh phải ẨN task này', NOW() + INTERVAL '5 days', 'Bình thường', 'Đang xử lý', 'Thủ công', 'HK1 2026-2027')
     RETURNING id, title, status`
  );
  const byTitle = Object.fromEntries(ins.rows.map((r) => [r.title.split(' ')[0], r.id]));
  console.log('✅ Đã tạo tasks:', ins.rows.map((r) => `${r.id}:${r.title.split(' ')[0]}(${r.status})`).join(', '));

  // 4. Gán điểm danh: SV1 kỳ vọng 2/3, SV2 kỳ vọng 0/1
  const assign = async (taskKey, student, status) => {
    await pool.query(
      `INSERT INTO task_assignments (task_id, student_id, class_code, status)
       VALUES ($1, $2, $3, $4) ON CONFLICT (task_id, student_id) DO UPDATE SET status = EXCLUDED.status`,
      [byTitle[taskKey], student.student_id, student.class_id, status]
    );
  };
  await assign('TEST_DIEMDANH_01', sv1, 'Đã tham gia');
  await assign('TEST_DIEMDANH_02', sv1, 'Vắng');
  await assign('TEST_DIEMDANH_03', sv1, 'Đã tham gia');
  await assign('TEST_DIEMDANH_04', sv1, 'Được phân công'); // đối chứng: task chưa kết thúc
  if (sv2) {
    await assign('TEST_DIEMDANH_01', sv2, 'Vắng'); // kỳ vọng 0/1
  }
  console.log('✅ Đã gán điểm danh (SV1 kỳ vọng 2/3, SV2 kỳ vọng 0/1).');

  // 5. Kiểm chứng đúng câu SQL của API /api/students/:id/attendance
  for (const sv of [sv1, ...(sv2 ? [sv2] : [])]) {
    const r = await pool.query(
      `SELECT t.title, t.status AS task_status, ta.status AS assignment_status
       FROM task_assignments ta JOIN tasks t ON t.id = ta.task_id
       WHERE ta.student_id = $1 AND t.status IN ('Hoàn thành', 'Kết thúc')
       ORDER BY t.deadline DESC`,
      [sv.student_id]
    );
    const attended = r.rows.filter((x) => x.assignment_status === 'Đã tham gia').length;
    console.log(`\n— ${sv.student_id}: ${attended}/${r.rows.length}`);
    r.rows.forEach((x) => console.log(`   [${x.assignment_status}] ${x.title} (${x.task_status})`));
  }

  console.log('\nKế tiếp:');
  console.log('  1) node src/server.js');
  console.log(`  2) curl http://localhost:5000/api/students/${sv1.student_id}/attendance`);
  console.log('  3) Mở tab Sinh viên → click hàng SV1 → panel phải hiện "Điểm danh sự kiện đã kết thúc (2/3)".');
  console.log('  4) Xóa mẫu khi test xong: DELETE FROM tasks WHERE title LIKE \'TEST_DIEMDANH\\\\_%\';');
  await pool.end();
}

main().catch((e) => { console.error('❌ Seed lỗi:', e.message); process.exit(1); });
