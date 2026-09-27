# DACN_CTSV
Xây dựng website số hóa quy trình làm việc của công tác sinh viên
Link web:dacn-ctsv.netlify.app

## Danh sách thành viên

| STT | MSSV | Họ và tên | Email |
|-----|------|-----------| ------|
| 1 | 2312637 | Trần Gia Huy| 2312637@dlu.edu.vn|
| 2 | 2312646 | Trần Quốc Khánh| 2312646@dlu.edu.vn|
| 3 | 2312690 | Nguyễn Nhất Minh| 2312690@dlu.edu.vn| 

## Setup sau khi pull code
### 1.Thiết lập Backend:
Thư mục: backend/
Mở command prompt và di chuyển vào thư mục backend bằng lệnh: cd DACN_CTSV/backend
Cài đặt các gói thư viện phụ thuộc bằng lệnh: npm install
Khởi động server bằng lệnh: node src/server.js
Command prompt sẽ hiển thị thông báo server đang chạy thành công và báo kết nối cơ sở dữ liệu thành công

### 2.Thiết lập Frontend:
Thư mục: frontend/
Mở một cửa sổ command prompt mới (giữ nguyên backend đang chạy) và di chuyển vào thư mục frontend: cd DACN_CTSV/frontend
Cài đặt thư viện bằng lệnh: npm install
Khởi động ứng dụng frontend bằng lệnh: npm run dev (do dự án được cấu hình bằng Vite) Command prompt sẽ cung cấp một đường dẫn tới trang web
Nhấp vào đường dẫn này hoặc mở trình duyệt web để xem giao diện
