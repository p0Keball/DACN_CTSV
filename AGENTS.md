# AGENTS.md — DACN_CTSV

Student-affairs workflow web app. No monorepo tooling; `backend/` and `frontend/` are independent npm projects. No `AGENTS.md`/`opencode.json`/CI existed before — this file is the source.

## Structure

- `backend/src/server.js` — entire API (monolith, ~380 lines). `src/routes/` and `src/controllers/` are empty; add routes inline there.
- `backend/src/config/db.js` — Supabase Postgres `pg.Pool` (`ssl: { rejectUnauthorized: false }`, required).
- `frontend/src/` — Vite + React 19 + TS + Ant Design. Entrypoints: `App.tsx` (routes `/`, `/sinh-vien`, `/cong-viec`), `services/api.ts` (all API calls), `pages/`, `components/`.
- `database-script.md` — authoritative schema (7 tables). `yeucau.md` — product spec (Vietnamese); its DLU base URL is stale, trust code instead.

## Commands

Root `package-lock.json` is empty — always run inside `backend/` or `frontend/`.

- Backend: `cd backend && npm install`, then `node src/server.js` (port 5000). There is **no** `dev`/`start` script despite what `README.md` claims — `npm run dev` fails; use node directly or `npx nodemon src/server.js`.
- Frontend: `cd frontend && npm install && npm run dev` (Vite, usually :5173). Verify: `npm run lint`, `npm run build` (`tsc -b && vite build`).
- Backend has no tests/lint/typecheck; `npm test` is a stub that exits 1.
- Run both servers concurrently for any end-to-end work.

## Env & services

- `backend/.env` (gitignored, no `.env.example`, must create by hand): `PORT`, `DATABASE_URL` (Supabase pooler `:6543/postgres`), `DLU_API_KEY`. Loaded via `dotenv` in both `server.js` and `db.js`.
- Frontend needs no env file: `services/api.ts` uses `VITE_API_URL` or defaults to `http://localhost:5000/api`.
- DB is remote Supabase — no local migration step; schema changes go in `database-script.md` + applied to Supabase directly.
- Student source API is hardcoded in `server.js:46` (`POST https://quan-ly-dao-tao-api.nguyentronghieu.io.vn/api/v1/LayDanhSachSinhVienTheoLop`, body `{ Id: classId }`, header `X-API-KEY`). Do not use the old `apidog.io` URL from `yeucau.md`.
- eOffice (§3, flow B auto): `backend/src/services/eoffice.service.js` adapter (`getDocuments/getDocumentDetail/downloadAttachment`, `EOFFICE_PROVIDER=mock|http`, `EOFFICE_BASE_URL`, no auth on clone API). `tasks.eoffice_id` UNIQUE = dedupe key; `POST /api/eoffice/documents/:id/create-task` creates task + auto-downloads available attachments to local `uploads/`. Gọi lại endpoint trên văn bản đã tạo = **đồng bộ file còn thiếu** (không tạo task mới, bỏ qua file đã có theo `file_name`). `task_attachments.file_type` phải là `TEXT` — MIME của `.xlsx/.docx/.pptx` dài 65–73 ký tự, `VARCHAR(50)` từng làm mất file.
- AI Phase 1+vision: `POST /api/tasks/:id/draft-email` trích chữ PDF/DOCX/XLSX/TXT (cắt 12000 ký tự) → Gemini (`GEMINI_MODEL`, key chỉ ở backend `.env`) viết `{subject, body}` giọng hành chính; PDF scan/ảnh gửi thẳng cho AI đọc hình (vision, ≤15MB, khỏi OCR cục bộ); link ngoài/file quá lớn bỏ qua có lý do. Nút "AI soạn từ file" ở khối file trang Soạn (task đã lưu); lỗi hiện đúng message backend + bảng lý do từng file. Prompt (`ai.service.js`) bám mẫu email thật `email-patterns.docx`: tiêu đề `[THÔNG BÁO]`/`[NHẮC]`/`[KẾ HOẠCH]`/`[MỜI HỌP]`, lời chào 3 dòng, mục 1/2/3, khối kết chuẩn.
- Mail thật + nhắc hạn: `services/mail.service.js` (nodemailer Gmail SMTP, `MAIL_DRY_RUN=true` = chỉ log không gửi); `POST /api/tasks/:id/send` gửi To/Cc tách theo `kind`; job cron `REMIND_CRON` (mặc định 30p) **chỉ nhắc task `'Đã gửi'`, mỗi task đúng 1 lần và chỉ trước deadline** trong cửa sổ `remind_before_days` (0 = không nhắc); quá deadline task tự `'Kết thúc'` nên không nhắc nữa; Cc không nhận nhắc; nút CC ở trang Soạn suy ra từ `task_recipients.kind='cc'` (task lưu CC tắt mở lại sẽ hiện nút tắt, không tự bật lại; soạn mới auto-thêm cụm Cc 1 lần từ `cc_contacts`); chạy tay `POST /api/reminders/run` (cần login).
  - Gửi mail kèm bảng phân công: body nhận `include_assignments` (mặc định `true`, checkbox ở trang Soạn). ≤50 SV chèn bảng HTML (MSSV/Họ tên/Lớp) **ngay trước khối kết** (`Kính mong`/`Kính nhờ`/`Trân trọng cảm ơn`, không thấy mốc thì nối cuối); >50 chèn 50 dòng + "… và N sinh viên khác" và đính kèm Excel đầy đủ. Người nhận vẫn lấy từ `task_recipients`, **không tự gửi cho SV**. Trang Soạn hiện bảng xem trước **ngay trong editor** (ProseMirror widget decoration, không lưu vào `content`, không nhân đôi khi gửi) và ẩn/hiện theo checkbox `includeAssignments`.
- Phân công SV: xem danh sách SV chi tiết trong Drawer tab "3. Phân công" (chỉ xem, MSSV/Họ tên/Lớp). Hồ sơ SV dùng `GET /api/students/:id/assignments` (mọi trạng thái task). UI điểm rèn luyện/điểm danh đã ẩn; bảng `task_assignments`, cột `status`, endpoint reports/attendance vẫn giữ.

## Conventions & gotchas

- API shape is always `{ success, data?, message? }`. DB columns are `snake_case`, but `GET /api/students` aliases to PascalCase (`StudentID`, `FirstName`, …) to match DLU payloads — keep this mapping; `POST/PUT /api/students` also expects PascalCase keys.
- `POST /api/students/sync` requires one concrete `classId`; it 400s on empty/`'all'`. It upserts `classes` then `students` (`ON CONFLICT DO UPDATE`).
- Task status/priority strings are Vietnamese literals — status lifecycle: **3 trạng thái** `'Nháp'` → `'Đã gửi'` → `'Kết thúc'`; priority: `'Cao'`, `'Bình thường'`, `'Thấp'`. `'Đã gửi'` **tự chuyển `'Kết thúc'` khi quá `deadline`** qua `closeExpiredTasks()` (gọi ở GET tasks/stats/reports/attendance + cron nhắc hạn); `'Nháp'` không auto-close. "Quá hạn" **không còn là trạng thái**. Stats/report queries in `server.js` depend on them — don't rename without updating SQL + UI (`STATUS_OPTIONS`, charts). Legacy rows: run the migration in `database-script.md`.
- Tab soạn (`TasksWorkspace.tsx`): × trên tab có thay đổi mở modal **Lưu và Đóng** (auto-save nháp rồi đóng; lỗi giữ modal). Nút **Danh sách** (Tag đầu workspace + nút cột thao tác trong `TaskCompose`) tự Lưu nháp tab đang mở trước khi chuyển; tab `new-*` lưu xong đổi thành `edit-<id>` để không tạo trùng task. Lưu nháp/auto-save **không bắt buộc Tiêu đề** — dùng `'Không có tiêu đề'`; Gửi vẫn validate đủ field.
- Attachments: uploads saved to `backend/src/uploads/` (not gitignored, served statically at `/uploads`). Multer filename fix `Buffer.from(name,'latin1').toString('utf8')` preserves Vietnamese names — keep it on any new upload path. Anti-waste: SHA-256 dedupe (`task_attachments.file_hash`) reuses existing file for identical content; deleting an attachment/task unlinks the disk file only when no other row references it (`unlinkIfOrphan`). Audit script pattern: list disk files vs `file_url` basenames to find orphans.
- Frontend: AntD primary color `#237804` set in `App.tsx` `ConfigProvider`; keep. Excel export lives in `utils/exportExcel.ts` (uses `xlsx` from SheetJS CDN URL, not npm registry — don't "fix" the dependency).

Đọc .env.example để biết cấu hình, không đọc .env

# Trợ lý Công tác sinh viên — AGENTS.md

## Ngữ cảnh dự án
- Yêu cầu đầy đủ: xem docs/yeucau.md
- Schema database (PostgreSQL/Supabase): xem database-script.md

## Stack
- Frontend: React + Ant Design (localhost:5173)
- Backend: (điền: Node/Express hay Go — theo phần bạn đã chốt)
- Database: PostgreSQL trên Supabase

## Tình trạng hiện tại
- ĐÃ HOÀN THÀNH: Quản lý Sinh viên (đồng bộ qua API DLU Proxy), Giáo viên chủ nhiệm (CRUD), Quản lý Lớp học (gán GVCN theo lớp)
- ĐANG VƯỚNG: tab "Công việc" — tổ chức giao diện và luồng chức năng chưa hợp lý, cần review lại trước khi làm tiếp phần đồng bộ eOffice và nhắc email

## Quy ước code
- (điền: cấu trúc thư mục, style component, quy tắc đặt tên API...)