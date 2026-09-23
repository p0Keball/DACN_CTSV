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

## Conventions & gotchas

- API shape is always `{ success, data?, message? }`. DB columns are `snake_case`, but `GET /api/students` aliases to PascalCase (`StudentID`, `FirstName`, …) to match DLU payloads — keep this mapping; `POST/PUT /api/students` also expects PascalCase keys.
- `POST /api/students/sync` requires one concrete `classId`; it 400s on empty/`'all'`. It upserts `classes` then `students` (`ON CONFLICT DO UPDATE`).
- Duplicate `GET /api/tasks` exists in `server.js` (~line 118 and ~line 295); the later registration (`ORDER BY deadline ASC`) wins. Remove the dead one when touching tasks.
- Task status/priority strings are Vietnamese literals (`'Mới'`, `'Đang xử lý'`, `'Hoàn thành'`, `'Bình thường'`, `'Cao'`); stats query in `/api/tasks/stats` depends on them — don't rename without updating SQL.
- Attachments: uploads saved to `backend/src/uploads/` (not gitignored, served statically at `/uploads`). Multer filename fix `Buffer.from(name,'latin1').toString('utf8')` preserves Vietnamese names — keep it on any new upload path.
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