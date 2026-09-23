# Đặc tả yêu cầu dự án: Website số hóa quy trình làm việc của Trợ lý Công tác sinh viên (CTSV)

> File này tổng hợp toàn bộ đề cương, mô tả nghiệp vụ và yêu cầu kỹ thuật của đồ án chuyên ngành, dùng làm ngữ cảnh (context) cho AI coding agent khi triển khai dự án.

## 1. Bối cảnh & mục tiêu

Trợ lý Công tác sinh viên (CTSV) hiện quản lý công việc thủ công, rời rạc trên nhiều kênh:

- **eOffice** – hệ thống văn bản hành chính của trường, nơi phát sinh công việc/thông báo/phối hợp cần xử lý.
- **Google Sheet** – phân công sinh viên tham gia sự kiện (cập nhật thời gian thực, giáo viên/lớp trưởng tự điền).
- **Thư mục local trên máy** – lưu file đính kèm theo từng tháng/sự kiện.
- **Gmail** – biên soạn và gửi thông báo/nhắc việc thủ công.

**Mục tiêu:** xây một web app duy nhất số hóa toàn bộ quy trình: nhận việc (từ eOffice) → tạo công việc → phân công sinh viên/giáo viên chủ nhiệm → theo dõi tiến độ, nhắc hạn tự động qua email → lưu trữ file tập trung → báo cáo/thống kê (đặc biệt điểm rèn luyện theo học kỳ).

## 2. Vai trò người dùng (Actors)

| Vai trò | Mô tả |
|---|---|
| **Trợ lý CTSV (Admin)** | Người dùng chính, toàn quyền: tạo/quản lý công việc, phân công, gửi email, xem báo cáo |
| **Giáo viên chủ nhiệm (GVCN)** | Đối tượng được thông báo/nhắc việc; chưa rõ có tài khoản đăng nhập hay chỉ là "liên hệ" trong DB — cần hỏi GVHD |
| **Sinh viên** | Đối tượng bị quản lý (tham gia sự kiện, được nhắc); dữ liệu lấy qua API khoa, khả năng không cần tài khoản ở MVP |
| **Lãnh đạo khoa/phòng ban** | Nhận báo cáo hoàn thành công việc (ví dụ: phó khoa phụ trách CTSV) |

Cần có ít nhất 2 vai trò: **Admin** và một vai trò **xem-only** (báo cáo).

## 3. Module eOffice (quan trọng — đọc kỹ)

Giảng viên **không giao API thật của trường**. Thay vào đó:

- Giảng viên sẽ **clone dữ liệu mẫu** từ eOffice và **dựng một service giả lập (mock service)** có cấu trúc tương tự eOffice thật.
- Sinh viên **tích hợp/gọi API của service giả lập này** như thể là eOffice thật.
- Sau khi đồ án hoàn thiện và **nghiệm thu đạt**, giảng viên sẽ **thay API mock bằng API thật** của trường.

**Yêu cầu thiết kế bắt buộc:** module đồng bộ eOffice phải được **tách lớp (adapter/service layer)**, ví dụ interface `EOfficeService` với các hàm `getDocuments()`, `getDocumentDetail(id)` — để khi đổi từ mock sang API thật chỉ cần đổi implementation, không sửa logic nghiệp vụ.

Cấu trúc dữ liệu văn bản/công việc từ eOffice cần ánh xạ tối thiểu các trường (dựa trên UI thực tế của trường):

- Số đến/đi
- Trích yếu (nội dung)
- Nơi gửi / Nơi nhận
- Loại văn bản (Thông báo / Công việc / Phối hợp)
- Mức độ ưu tiên (Việc quan trọng)
- Trạng thái (Chưa xem / Đã xem / Hoàn thành)
- Ngày ban hành
- File văn bản + File đính kèm
- Chức năng liên quan: "Chuyển tiếp", "Hoàn thành", "Tạo việc"

## 3.1. Module eOffice → tạo Công việc (bản chất là soạn email)

**Nguyên tắc quan trọng — đọc kỹ trước khi code:**
Dữ liệu từ eOffice CHỈ LÀ NGUYÊN LIỆU ĐẦU VÀO, không phải là chính "Công việc" trong hệ thống.
Hành động "Tạo công việc" trong app này, về bản chất, là hành động SOẠN VÀ GỬI MỘT EMAIL
tới các bên liên quan (giảng viên chủ nhiệm, lớp, phòng ban...), có deadline, có thể
gửi nhắc tự động, và có lịch sử gửi. Vì vậy field trong "Công việc" phải là field của
một email có vòng đời, không phải field mô tả tĩnh của 1 văn bản hành chính.

### Dữ liệu eOffice cung cấp (chỉ để tham chiếu / soạn email, KHÔNG lưu là nội dung chính)
- Số đến/đi — mã tham chiếu văn bản gốc, hiển thị dạng thu gọn để tra cứu lại
- Trích yếu — dùng làm NGUYÊN LIỆU để soạn Nội dung email (agent hoặc trợ lý CTSV
  đọc trích yếu rồi viết lại thành nội dung email gửi cho người nhận, không copy nguyên văn)
- Nơi gửi — đơn vị phát hành văn bản gốc (chỉ để biết nguồn, KHÔNG phải người nhận email)
- Nơi nhận (trong eOffice) — KHÔNG map trực tiếp thành người nhận email của Công việc.
  Trợ lý CTSV phải tự chọn người nhận email thật (GVCN của lớp nào, phòng ban nào...)
  dựa trên nội dung việc cần làm — đây là bước biên soạn, không phải copy field
- Ngày ban hành — mốc thời gian văn bản được phát hành, dùng tham khảo, KHÔNG phải deadline
- File văn bản gốc + file đính kèm — giữ lại làm tài liệu tham chiếu, có thể đính kèm
  luôn vào email gửi đi nếu cần
- Mức độ ưu tiên / Loại văn bản — tham khảo để gợi ý mức ưu tiên cho Công việc, KHÔNG bắt buộc giữ nguyên

### Field thật sự cần có trên entity "CongViec" (independent với eOffice)
- Nguồn: `EOffice` | `ThuCong` (+ tham chiếu SoDenDi/NgayBanHanh nếu từ EOffice, optional)
- TieuDe — dùng làm **Subject** khi gửi email
- NoiDung — dùng làm **Body** email (rich text), do trợ lý CTSV tự soạn (có thể có nút
  "AI soạn email từ trích yếu eOffice" để hỗ trợ, nhưng luôn cho sửa lại trước khi gửi)
- NguoiNhan[] — danh sách email/nhóm nhận thật (GVCN theo lớp cụ thể, nhóm định sẵn như
  "Toàn thể GVCN khoa", "Phòng văn thư", hoặc email nhập tay) — đây là field khác hẳn "Nơi nhận" của eOffice
- Deadline + tuỳ chọn "tự động gửi email nhắc trước hạn X ngày"
- MucDoUuTien: Cao / Bình thường / Thấp
- TrangThai: MoiTao → DaSoan (nháp) → DaGui → DangCho phản hồi → HoanThanh / QuaHan
- FileDinhKem[] (kèm theo email khi gửi)
- LoaiCongViec: `ThongBaoDon` (chỉ cần soạn + gửi email) | `ChienDichPhanCong`
  (cần thêm bước chọn lớp, chỉ tiêu, theo dõi sinh viên đăng ký — xem mục 2)
- LichSuGui[] — log mỗi lần gửi mail liên quan: loại (Gửi lần đầu / Nhắc tự động /
  Báo cáo hoàn thành), thời gian, người nhận thực tế

**Chưa có sẵn:** endpoint/schema cụ thể của service mock — giảng viên sẽ gửi link sau. Nên thiết kế sẵn interface + mock data nội bộ để không bị chặn tiến độ.

## 4. API sinh viên khoa (đã có sẵn — dùng ngay được)

- **Base URL (demo):** `https://kg8vuz7mh4.apidog.io/` (tên hệ thống: "Portal Online DLU Proxy", có thể đổi domain khi triển khai chính thức)
- **Auth:** header `X-API-KEY`
- **Endpoint chính:** `POST /api/v1/LayDanhSachSinhVienTheoLop` — truyền mã lớp, trả về danh sách sinh viên trong lớp
- **Các endpoint khác cùng nhóm:**
  - Lấy danh sách điểm học tập theo lớp
  - Lấy danh sách điểm rèn luyện theo lớp
  - Lấy danh sách quyết định của sinh viên
  - Lấy danh sách quyết định miễn giảm học phí của sinh viên
  - Lấy bảng điểm chi tiết của sinh viên
  - Lấy chi tiết chương trình đào tạo
  - `Check health` (GET)

**Response mẫu (mỗi sinh viên):**

```json
{
  "Gender": "Nam",
  "BirthDay": "19/10/2004",
  "LastName": "Long",
  "FirstName": "Huỳnh Tuấn",
  "IsInClass": true,
  "StudentID": "2347C035",
  "BirthPlace": "Tỉnh Hưng Yên",
  "ClassRoleID": 0,
  "StudentName": "[2347C035] Huỳnh Tuấn Long",
  "ClassStudentID": "ITK47C",
  "StudyProgramID": "CQ23CT-PM",
  "PermanentResidence": "...",
  "StudentNameWithoutID": "Huỳnh Tuấn Long"
}
```

- `ClassRoleID`: `0` = sinh viên thường, `1` = lớp trưởng
- Mã lớp: khoa đã đổi tiền tố từ `CTK` → `ITK`; hiện có khóa **46 đến 49** (VD: ITK46A, ITK47B, ITK47C...)

**Hệ quả thiết kế:** Sinh viên và Lớp **không cần lưu trùng lặp** trong DB riêng — gọi API này realtime hoặc cache định kỳ. Cần tự tạo bảng riêng cho:
- **Giáo viên chủ nhiệm** (không có trong API trên): họ tên, số điện thoại, email, lớp phụ trách.
- **Phân công sinh viên tham gia sự kiện**: bảng ánh xạ SinhVien ↔ SuKien/CongViec, có trạng thái đã điền/chưa điền, đã tham gia/chưa tham gia.

## 5. Nhóm chức năng chi tiết (Functional Requirements)

### 5.1 Quản lý Công việc (core)
- CRUD công việc: tiêu đề, nội dung, loại (Thông báo/Sự kiện/Phối hợp/Công việc nội bộ), thời hạn xử lý, mức độ ưu tiên, người phụ trách, trạng thái (Chưa xử lý/Đang xử lý/Chờ phản hồi/Hoàn thành/Quá hạn), file đính kèm, nguồn gốc (Tạo thủ công / Đồng bộ từ eOffice)
- Xem chi tiết, lịch sử xử lý

### 5.2 Đồng bộ eOffice
- Xem chi tiết ở mục 3. Cho phép chuyển 1 văn bản/thông báo từ eOffice thành 1 công việc trên hệ thống (1 click, tương tự nút "Tạo việc")

### 5.3 Quản lý Sinh viên / Lớp / Giáo viên chủ nhiệm
- Tra cứu sinh viên theo lớp (qua API DLU Proxy, mục 4)
- CRUD Giáo viên chủ nhiệm + gán lớp phụ trách
- Không cần CRUD sinh viên/lớp (đã có API nguồn)

### 5.4 Phân công sự kiện (thay thế Google Sheet thủ công)
- Tạo "đợt phân công" gắn với 1 công việc/sự kiện, chọn lớp tham gia
- Danh sách sinh viên trong lớp tự load từ API, trạng thái: Đã đăng ký / Chưa đăng ký / Đã xác nhận tham gia
- Cơ chế nhắc nhở tự động với lớp/sinh viên chưa điền (email tới GVCN hoặc lớp trưởng — `ClassRoleID = 1`)
- Lưu vết "đã tham gia sự kiện" → phục vụ thống kê điểm rèn luyện

### 5.5 Email tự động
- Biên soạn + gửi thông báo (khi tạo công việc, chọn người nhận)
- Nhắc hạn tự động: job chạy định kỳ, kiểm tra công việc sắp/đã hết hạn → gửi email nhắc (template tùy biến)
- *(Mở rộng)* tích hợp LLM (Gemini/ChatGPT API) để tự động soạn nội dung email từ nội dung công việc

### 5.6 Quản lý file đính kèm
- Mỗi công việc có nhiều file đính kèm, lưu trữ tập trung (thay thế folder local theo tháng), có thể tìm kiếm

### 5.7 Báo cáo & Thống kê
- Báo cáo công việc theo ngày/tuần/tháng/quý/năm
- Thống kê theo học kỳ: mỗi sinh viên đã tham gia bao nhiêu sự kiện (phục vụ điểm rèn luyện)
- Dashboard tổng quan gồm:
  - Thẻ số liệu: công việc đang xử lý / sắp đến hạn / quá hạn / hồ sơ chờ xử lý / hoàn thành tháng này
  - Biểu đồ tiến độ công việc theo tuần (bar/stacked)
  - Biểu đồ tròn cơ cấu trạng thái công việc
  - Bảng: công việc gần đây, công việc sắp đến hạn, danh sách sinh viên/hồ sơ cần chú ý

### 5.8 Quản lý tài khoản & phân quyền cơ bản

### 5.9 *(Mở rộng — không bắt buộc MVP)*
OCR đọc file PDF scan → tự động trích xuất nội dung → tự động tạo công việc trên hệ thống

## 6. Công nghệ sử dụng

- **Frontend:** React + **Ant Design** (giao diện dạng admin dashboard có sẵn layout sidebar/header/table — chỉ cần ghép dữ liệu). Toàn bộ giao diện tập trung dạng trang admin: mỗi module (lớp, sinh viên, GVCN, công việc...) đều có bảng danh sách + thêm/sửa/xóa + xem chi tiết.
- **Backend:** ⚠️ **chưa thống nhất** — đề cương chính thức cho phép Node.js/Express, Java, Golang hoặc PHP; kế hoạch chi tiết trong đề cương (tuần 6) ghi cụ thể **Go (Goroutines cho Background Worker)**; nhưng tài liệu hướng dẫn thực hành của giảng viên lại nói **"Node để demo cho dễ"**. → Cần chốt lại với GVHD trước khi code.
- **Database:** PostgreSQL hoặc MySQL
- **Công cụ thiết kế UI:** Figma, Canva
- **Công cụ dev:** VS Code, IntelliJ IDEA; quản lý mã nguồn bằng Git/GitHub; test API bằng Postman

## 7. Thứ tự triển khai ưu tiên (theo yêu cầu giảng viên)

Giảng viên nhấn mạnh: **"tập trung phân tích làm rõ yêu cầu trước khi code"**. Thứ tự sau khi yêu cầu đã rõ:

1. Quản lý sinh viên, lớp, giáo viên chủ nhiệm (dùng API DLU Proxy có sẵn — mục 4)
2. Đồng bộ eOffice (dùng mock service, giảng viên cung cấp sau — mục 3) → tạo công việc tự động
3. Lưu trữ file
4. Phân công sự kiện, nhắc nhở, thống kê điểm rèn luyện, email tự động (phần còn lại)

## 8. Kế hoạch thời gian (theo đề cương chính thức)

| STT | Công việc | Thời gian |
|---|---|---|
| 1 | Tìm hiểu đề tài, liên hệ GVHD, lập đề cương | 03/08 – 10/08/2026 |
| 2 | Phân tích yêu cầu nghiệp vụ CTSV, thiết kế CSDL PostgreSQL và kiến trúc hệ thống | 11/08 – 23/08/2026 |
| 3 | Thiết kế UI/UX trên Figma, dựng cấu trúc dự án (Go + React) | 24/08 – 06/09/2026 |
| 4 | Module tích hợp API hệ thống trường & RESTful API công việc cơ bản | 07/09 – 13/09/2026 |
| 5 | Báo cáo tiến độ lần 1 | 14/09 – 20/09/2026 |
| 6 | Background Worker bằng Go (Goroutines) & module gửi mail tự động | 21/09 – 04/10/2026 |
| 7 | Giao diện Frontend (React) & tích hợp quy trình workflow tự động | 05/10 – 11/10/2026 |
| 8 | Báo cáo tiến độ lần 2 | 12/10 – 18/10/2026 |
| 9 | Kiểm thử hệ thống (chức năng, giao diện, tương thích trình duyệt) | 19/10 – 08/11/2026 |
| 10 | Sửa chữa, hoàn thiện đồ án | 09/11 – 15/11/2026 |
| 11 | Báo cáo đồ án theo hội đồng | 16/11 – 22/11/2026 |

## 9. Những điểm còn mơ hồ — cần hỏi lại giảng viên hướng dẫn

1. Endpoint/schema cụ thể của **service eOffice giả lập** (chưa có, giảng viên hứa gửi sau).
2. Backend dùng **Node hay Go** chính thức.
3. Có cần **đăng nhập cho GVCN/sinh viên** hay chỉ 1 tài khoản admin (trợ lý CTSV) duy nhất?
4. Cơ chế gửi email: dùng SMTP thường hay tích hợp Gmail API (quy trình thật hiện dùng Gmail cá nhân)?
5. OCR và tích hợp LLM soạn email — bắt buộc hay chỉ là điểm cộng mở rộng?

## 10. Tài liệu tham khảo (từ đề cương gốc)

- HTML, CSS, JavaScript — W3Schools (https://www.w3schools.com)
- Ngôn ngữ Go (Golang) — https://go.dev/doc/
- React.js — https://react.dev
- Tài liệu RESTful API, Microservices
