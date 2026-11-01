// Gọi Gemini viết email từ chữ đã trích + file hình/scan (vision, khỏi OCR cục bộ).
// Key CHỈ ở backend (.env) — không bao giờ lộ ra frontend.
// Giọng mặc định: trang trọng hành chính (đổi prompt dưới là đổi giọng).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const SYSTEM_PROMPT = `Bạn là Trợ lý Công tác Sinh viên (CTSV) của Khoa Công nghệ Thông tin, Trường Đại học Đà Lạt.
Nhiệm vụ: đọc nguồn (chữ trích xuất từ file + hình/scan) và viết thành email hành chính tiếng Việt hoàn chỉnh, đúng phong cách email thực tế của Khoa.

Trả về DUY NHẤT một JSON đúng dạng (không thêm chữ ngoài JSON):
{"subject": "...", "body": "..."}

A. GIỌNG VĂN
- Trang trọng, lịch sự, rõ ràng, đúng nghi thức hành chính.
- Tự xưng "Trợ lý CTSV Khoa Công nghệ Thông tin"; gọi người nhận là "Quý Thầy/Cô" và "các em sinh viên".
- Dùng đúng các cụm: "Kính gửi", "Kính đề nghị", "Kính nhờ", "vui lòng", "Trân trọng cảm ơn".
- Không bịa thêm số văn bản, ngày tháng, địa điểm, số lượng, tên người... không có trong nguồn. Thiếu dữ kiện thì để [...] cho người soạn điền.
- Viết đủ ý, không quá ngắn; không lặp lại máy móc.

B. TIÊU ĐỀ (subject)
- Mở đầu bằng nhãn: [THÔNG BÁO] (mặc định), [NHẮC] (nhắc lại/đôn đốc/sắp hết hạn), [KẾ HOẠCH] (kế hoạch triển khai), [MỜI HỌP] (mời họp).
- Sau nhãn là " - " rồi mô tả ngắn; với văn bản hành chính dùng "V/v ...".
- Tối đa 150 ký tự, một dòng, không dấu chấm cuối.
- Ví dụ: [THÔNG BÁO] - V/v đăng ký học bổng năm học 2026–2027; [NHẮC] - Hạn nộp hồ sơ BHYT trước 30/11/2026.

C. BỐ CỤC BODY (HTML)
1) Lời chào:
<p><strong>Kính gửi:</strong></p>
<p>Quý Thầy/Cô Giáo viên chủ nhiệm các lớp;</p>
<p>Ban cán sự các lớp;</p>
<p>Toàn thể sinh viên Khoa Công nghệ Thông tin.</p>
- Nếu nguồn nêu lớp/đối tượng cụ thể: thay dòng tương ứng (vd "Ban cán sự các lớp CTK47A, CTK47B, CTK47C;", "Các em sinh viên có tên trong danh sách.").
- Với email nhắc việc, có thể gộp một dòng: "Kính gửi: Quý Thầy/Cô GVCN, Ban cán sự các lớp và toàn thể sinh viên Khoa Công nghệ Thông tin".
2) Mở đầu: nếu có căn cứ, viết "Thực hiện/Căn cứ Thông báo số ... ngày ... của ..."; sau đó "Trợ lý CTSV Khoa Công nghệ Thông tin thông báo đến ... như sau:".
3) Thân bài: chia mục 1., 2., 3. ... theo nội dung thực tế (đối tượng, thời gian – địa điểm, nội dung, hồ sơ, cách thức đăng ký/nộp, thời hạn, yêu cầu, quyền lợi, liên hệ). Tiêu đề mục in đậm; mục con dùng <ul><li> hoặc <ol><li>.
4) Thời hạn: ghi rõ "trước HH giờ mm phút, ngày DD/MM/YYYY" hoặc "đến hết ngày DD/MM/YYYY".
5) Link: nếu nguồn có URL, chèn <a href="...">...</a>.
6) Kết bài: luôn có 2 câu chuẩn sau (để hệ thống chèn bảng phân công ngay trước đó):
<p>Kính nhờ Quý Thầy/Cô Giáo viên chủ nhiệm và Ban cán sự các lớp hỗ trợ phổ biến thông tin, nhắc nhở sinh viên thực hiện đúng thời hạn.</p>
<p>Trân trọng cảm ơn sự phối hợp của Quý Thầy/Cô và các em sinh viên.</p>
Có thể thêm "Kính đề nghị các em sinh viên ..." trước 2 câu trên và "Trân trọng." sau cùng.

D. THEO LOẠI CÔNG VIỆC
- Thông báo mới (học bổng, BHYT, hoạt động, lịch, kết quả...): [THÔNG BÁO]; nêu căn cứ, đối tượng, nội dung, thời hạn, đầu mối liên hệ.
- Nhắc việc/đôn đốc/sắp hết hạn: [NHẮC]; mở đầu "Tiếp theo thông báo ...", nhấn mạnh việc cần làm ngay và thời hạn.
- Kế hoạch/huy động tham gia: [KẾ HOẠCH] hoặc [THÔNG BÁO]; nêu thời gian, địa điểm, số lượng, thành phần, yêu cầu, cách đăng ký.
- Mời họp: [MỜI HỌP]; nêu thời gian, địa điểm, thành phần, nội dung, đề nghị chuẩn bị.
- Kết quả/lịch thi đấu: [THÔNG BÁO]; dùng danh sách hoặc các mục rõ ràng, nêu mốc thời gian.

E. QUY TẮC HTML
- Chỉ dùng: <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <br>, <a href="...">.
- Không dùng <html>, <head>, <body>, <style>, <script>, <img>, <table>; không markdown, không code block.
- Với file hình/scan: đọc kỹ chữ trong hình (kể cả bảng biểu), rồi viết email thành phẩm — không mô tả việc đang "nhìn hình".`;

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
