# Cơ sở dữ liệu quản lý lớp học / sinh viên / công việc

## 1. Bảng Giảng viên (GVCN / Cán bộ)

```sql
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE, -- cho phép NULL: gỡ khỏi danh bạ = xoá hòm thư (giữ GV + phân công GVCN)
    phone VARCHAR(20),
    department VARCHAR(100) DEFAULT 'Khoa Công nghệ Thông tin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Bảng Lớp học

```sql
CREATE TABLE IF NOT EXISTS classes (
    email VARCHAR(100),
    class_code VARCHAR(20) PRIMARY KEY, -- Ví dụ: ITK46A, ITK47C
    class_name VARCHAR(100) NOT NULL,
    teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL, -- GVCN phụ trách
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Bảng Sinh viên (Khớp cấu trúc API DLU Proxy)

```sql
CREATE TABLE students (
  student_id VARCHAR(20) PRIMARY KEY, 
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  class_id VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE, -- Khóa ngoại liên kết với bảng classes
  birth_day VARCHAR(20),
  gender VARCHAR(20),
  role_id INTEGER DEFAULT 0,
  birth_place TEXT,
  permanent_residence TEXT,
  study_program_id VARCHAR(50),
  email VARCHAR(100), -- Thêm để sau này AI tự động gửi email nhắc nhở
  phone VARCHAR(20),
  is_in_class BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 4. Bảng Công việc / Sự kiện / Thông báo (Từ E-Office hoặc tạo mới)

```sql
CREATE TABLE IF NOT EXISTS tasks (
    task_type VARCHAR(50),
    ref_doc_number VARCHAR(50), 
    ref_issue_date TIMESTAMP, 
    remind_before_days INT,
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,          -- Tiêu đề công việc
    content TEXT,                         -- Trích yếu / Nội dung chi tiết
    deadline TIMESTAMP WITH TIME ZONE,    -- Thời hạn xử lý / Thời gian diễn ra
    priority VARCHAR(20) DEFAULT 'Bình thường', -- Thấp, Bình thường, Cao
    status VARCHAR(30) DEFAULT 'Nháp', -- 3 trạng thái: Nháp / Đã gửi / Kết thúc (Đã gửi tự -> Kết thúc khi quá deadline)
    source VARCHAR(50) DEFAULT 'Thủ công', -- E-Office, Thủ công, OCR PDF
    semester VARCHAR(20),                 -- Học kỳ (VD: HK1 2026-2027)
    eoffice_id VARCHAR(100),              -- Id văn bản eOffice gốc: dedupe, bấm "Tạo công việc" lại không nhân đôi task
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (eoffice_id)                   -- 1 văn bản eOffice chỉ tạo 1 công việc
);
```

## 5. Bảng Phân công Sinh viên tham gia Công việc / Sự kiện (Để tính ĐRL)

```sql
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Được phân công', -- Được phân công, Đã xác nhận, Đã tham gia, Vắng
    note TEXT,                            -- Ghi chú/Thành tích
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, student_id)           -- Một SV không bị phân công trùng 1 sự kiện
);
```

## 6. Bảng Lưu tệp đính kèm của Công việc

```sql
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,               -- Đường dẫn tải file / Supabase Storage
    file_size VARCHAR(50),
    file_type TEXT,                       -- MIME đầy đủ (xlsx/docx có MIME 65–73 ký tự; đừng để VARCHAR(50))
    file_hash VARCHAR(64),                -- SHA-256 nội dung file: trùng nội dung thì tái dùng file cũ (anti-waste)
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 7. Bảng Nhật ký và Lịch gửi email nhắc nhở tự động

```sql
CREATE TABLE IF NOT EXISTS email_reminders (
    send_type VARCHAR(50),
    kind VARCHAR(50),
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    recipient_email VARCHAR(100) NOT NULL,
    recipient_type VARCHAR(30),          -- GVCN, Ban Cán Sự, Sinh viên
    subject VARCHAR(255) NOT NULL,
    body_content TEXT NOT NULL,           -- Nội dung AI biên soạn hoặc template
    scheduled_at TIMESTAMP WITH TIME ZONE, -- Thời gian hẹn gửi
    sent_at TIMESTAMP WITH TIME ZONE,     -- Thời điểm đã gửi thực tế
    status VARCHAR(20) DEFAULT 'Chờ gửi', -- Chờ gửi, Đã gửi, Lỗi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 8. Bảng quản lý tài khoản Admin

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 9. Bảng quản lý người nhận thông báo công việc (chủ trì / phối hợp)

```sql
CREATE TABLE IF NOT EXISTS task_recipients (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    recipient_email VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_group VARCHAR(100),
    kind VARCHAR(50), -- loại: chủ trì, phối hợp...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 10. Bảng danh bạ CC (các khoa, ban giám hiệu,...)

```sql
CREATE TABLE IF NOT EXISTS cc_contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
---

## Migration (chạy trên Supabase nếu DB đã tạo từ trước)

```sql
-- Cho phép teachers.email = NULL: "gỡ khỏi danh bạ" chỉ xoá hòm thư, giữ GV + phân công GVCN
ALTER TABLE teachers ALTER COLUMN email DROP NOT NULL;

-- file_type phải chứa MIME đầy đủ: .xlsx/.docx/.pptx có MIME 65–73 ký tự,
-- VARCHAR(50) cũ làm INSERT lỗi "value too long" (mất file khi tạo từ eOffice/upload tay)
ALTER TABLE task_attachments ALTER COLUMN file_type TYPE TEXT;

-- Rút trạng thái công việc về 3 giá trị: Nháp / Đã gửi / Kết thúc
UPDATE tasks SET status='Nháp'     WHERE status IN ('Mới','Mới tạo','Lưu nháp','Đã soạn');
UPDATE tasks SET status='Đã gửi'   WHERE status IN ('Chờ phản hồi','Đang xử lý','Quá hạn');
UPDATE tasks SET status='Kết thúc' WHERE status IN ('Hoàn thành','Kết thúc');

ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'Nháp';
ALTER TABLE tasks ADD CONSTRAINT tasks_status_chk
  CHECK (status IN ('Nháp','Đã gửi','Kết thúc'));

-- Đóng ngay các task đã gửi mà đã quá deadline (đồng bộ với auto-close trong server)
UPDATE tasks SET status='Kết thúc'
WHERE status='Đã gửi' AND deadline IS NOT NULL AND deadline < now();

-- eOffice dedupe: lưu id văn bản gốc trên task — bấm "Tạo công việc" lại = đồng bộ file, không nhân đôi
-- (nếu cột/index đã tồn tại trên Supabase với tên khác thì bỏ qua 2 lệnh dưới)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS eoffice_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_eoffice_id_key ON tasks (eoffice_id);

-- Chống trùng file: SHA-256 nội dung — upload tay / eOffice cùng nội dung thì tái dùng file cũ
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS task_attachments_file_hash_idx ON task_attachments (file_hash);
```

---

## Tài khoản admin (bắt buộc trước khi dùng lần đầu)

Bảng `users` trống thì không đăng nhập được (mọi POST/PUT/DELETE đều yêu cầu Bearer token). Chạy một lần:

```bash
cd backend
node setup-admin.js   # tạo / cập nhật tài khoản admin/admin123 (bcrypt, salt 10)
```

- Nên đặt `JWT_SECRET` trong `backend/.env` — backend đang rớt về `dev-secret-change-me` khi thiếu (chỉ dùng cho dev).
- Đổi mật khẩu: mở `setup-admin.js`, sửa hằng `'admin123'` rồi chạy lại (script upsert theo username, an toàn chạy nhiều lần).
---

## Dữ liệu mẫu (Sample Data)

### Giảng viên / GVCN mẫu

```sql
INSERT INTO teachers (full_name, email, phone)
VALUES
('Nguyễn Trọng Hiếu', 'hieunt@dlu.edu.vn', '0912345678'),
('Trần Thị Phương Linh', 'linhttp@dlu.edu.vn', '0987654321');
```

### Lớp học mẫu

```sql
INSERT INTO classes (class_code, class_name, teacher_id)
VALUES
('ITK46A', 'Lớp ITK46A', 1),
('ITK47C', 'Lớp ITK47C', 2);
```

### Công việc mẫu lấy từ E-Office

```sql
INSERT INTO tasks (title, content, deadline, priority, status, source, semester)
VALUES
('Lễ khai giảng năm học 2026-2027', 'Huy động sinh viên tham dự lễ khai giảng tại Hội trường A32', '2026-09-05 07:15:00+07', 'Cao', 'Đã gửi', 'E-Office', 'HK1 2026-2027'),
('Danh sách sinh viên khen thưởng cấp Khoa', 'Rà soát và đề xuất danh sách khen thưởng nhân dịp Lễ Khai giảng', '2026-09-04 23:59:00+07', 'Bình thường', 'Nháp', 'E-Office', 'HK1 2026-2027');
-- Lưu ý: KHÔNG insert mẫu với trạng thái cũ ('Mới', 'Đang xử lý', 'Quá hạn'...) —
-- migration đã thêm constraints CHECK chỉ nhận 'Nháp' / 'Đã gửi' / 'Kết thúc'.
```
