# DACN_CTSV
Xây dựng website số hóa quy trình làm việc của công tác sinh viên

## Danh sách thành viên

| STT | MSSV | Họ và tên | Email |
|-----|------|-----------| ------|
| 1 | 2312637 | Trần Gia Huy| 2312637@dlu.edu.vn|
| 2 | 2312646 | Trần Quốc Khánh| 2312646@dlu.edu.vn|
| 3 | 2312690 | Nguyễn Nhất Minh| 2312690@dlu.edu.vn| 

## Setup sau khi pull code

### 1.Thiết lập Backend:
Thư mục: backend/
Mở terminal và di chuyển vào thư mục backend bằng lệnh: cd DACN_CTSV-main/backend
Cài đặt các gói thư viện phụ thuộc bằng lệnh: npm install
Khởi động server bằng lệnh: npm run dev hoặc npm start (dựa theo script cấu hình trong file package.json)
Terminal sẽ hiển thị thông báo server đang chạy thành công ở một cổng cụ thể (ví dụ: http://localhost:5000) và báo kết nối cơ sở dữ liệu thành công

### 2.Thiết lập Frontend:
Thư mục: frontend/
Mở một cửa sổ terminal mới (giữ nguyên terminal của backend đang chạy) và di chuyển vào thư mục frontend: cd DACN_CTSV-main/frontend
Cài đặt thư viện bằng lệnh: npm install
Khởi động ứng dụng frontend bằng lệnh: npm run dev (do dự án được cấu hình bằng Vite)
Cách kiểm tra: Terminal sẽ cung cấp một đường dẫn local (thường là http://localhost:5173)
Nhấp vào đường dẫn này hoặc mở trình duyệt web để xem giao diện
