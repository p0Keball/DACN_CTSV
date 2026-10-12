// Gọi Gemini viết email từ chữ đã trích + file hình/scan (vision, khỏi OCR cục bộ).
// Key CHỈ ở backend (.env) — không bao giờ lộ ra frontend.
// Giọng mặc định: trang trọng hành chính (đổi prompt dưới là đổi giọng).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const SYSTEM_PROMPT = `Bạn là trợ lý hành chính của Khoa Công nghệ Thông tin, Trường Đại học Đà Lạt.
Nhiệm vụ: đọc NỘI DUNG VĂN BẢN (nguyên liệu chữ + file hình/scan đính kèm) và viết thành email tiếng Việt lịch sự, giọng trang trọng hành chính.

Trả về DUY NHẤT một JSON đúng dạng (không thêm chữ nào ngoài JSON):
{"subject": "...", "body": "..."}

Quy tắc:
- subject: ngắn gọn đủ ý, tối đa 80 ký tự, KHÔNG xuống dòng.
- body: HTML đơn giản (chỉ dùng <p>, <strong>, <ul>, <li>, <br>), gồm: mở đầu "Kính gửi quý thầy/cô,", nội dung chính, thời hạn/deadline nếu nguyên liệu có nêu, kết "Trân trọng cảm ơn!".
- Với file hình/scan: đọc kỹ chữ trong hình trước (kể cả bảng biểu), rồi viết email — không mô tả việc đang "nhìn hình", chỉ đưa email thành phẩm.
- KHÔNG bịa thêm thông tin (số văn bản, ngày tháng, địa điểm...) không có trong nguyên liệu.
- Nếu nguyên liệu quá ngắn/không rõ, viết email chung chung lịch sự và để chỗ trống [...] cho người soạn điền.`;

async function draftEmail({ text, images = [] }) {
  if (!GEMINI_API_KEY) {
    const e = new Error('Chưa cấu hình GEMINI_API_KEY ở backend (file .env)');
    e.status = 500;
    throw e;
  }
  const parts = [];
  if (images.length > 0) {
    parts.push({ text: `Kèm theo là ${images.length} file hình/scan${text ? ' + phần chữ trích sẵn dưới đây' : ''}. Đọc kỹ cả hình lẫn chữ rồi viết email.` });
    for (const img of images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }
  parts.push({ text: text || '(không có chữ trích sẵn — chỉ dựa vào file hình đính kèm)' });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.5, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) {
    const e = new Error(`Gemini trả lỗi ${res.status} (kiểm tra key/quota/model)`);
    e.status = 502;
    try { e.detail = (await res.text()).slice(0, 300); } catch { /* bỏ qua */ }
    throw e;
  }
  const data = await res.json();
  const outText = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  const clean = outText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const e = new Error('AI trả về không đúng JSON — thử lại');
    e.status = 502;
    throw e;
  }
  return {
    subject: String(parsed.subject || '').replace(/\s+/g, ' ').trim().slice(0, 255),
    body: String(parsed.body || ''),
  };
}

module.exports = { draftEmail };
