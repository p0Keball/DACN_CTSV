# Cơ sở dữ liệu quản lý lớp học / sinh viên / công việc

## 1. Bảng Giảng viên (GVCN / Cán bộ)

```sql
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100) DEFAULT 'Khoa Công nghệ Thông tin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Bảng Lớp học

```sql
CREATE TABLE IF NOT EXISTS classes (
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
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,          -- Tiêu đề công việc
    content TEXT,                         -- Trích yếu / Nội dung chi tiết
    deadline TIMESTAMP WITH TIME ZONE,    -- Thời hạn xử lý / Thời gian diễn ra
    priority VARCHAR(20) DEFAULT 'Bình thường', -- Thấp, Bình thường, Cao
    status VARCHAR(30) DEFAULT 'Mới',     -- Mới, Đang xử lý, Chờ phản hồi, Hoàn thành, Quá hạn
    source VARCHAR(50) DEFAULT 'Thủ công', -- E-Office, Thủ công, OCR PDF
    semester VARCHAR(20),                 -- Học kỳ (VD: HK1 2026-2027)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 5. Bảng Phân công Sinh viên tham gia Công việc / Sự kiện (Để tính ĐRL)

```sql
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Được phân công', -- Được phân công, Đã tham gia, Vắng
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
    file_type VARCHAR(50),                -- pdf, docx, xlsx, img...
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 7. Bảng Nhật ký và Lịch gửi email nhắc nhở tự động

```sql
CREATE TABLE IF NOT EXISTS email_reminders (
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
('Lễ khai giảng năm học 2026-2027', 'Huy động sinh viên tham dự lễ khai giảng tại Hội trường A32', '2026-09-05 07:15:00+07', 'Cao', 'Đang xử lý', 'E-Office', 'HK1 2026-2027'),
('Danh sách sinh viên khen thưởng cấp Khoa', 'Rà soát và đề xuất danh sách khen thưởng nhân dịp Lễ Khai giảng', '2026-09-04 23:59:00+07', 'Bình thường', 'Mới', 'E-Office', 'HK1 2026-2027');
```
