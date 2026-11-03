// Gửi mail SMTP (Gmail) + chế độ dry-run để test không chạm mail thật.
// Env: SMTP_HOST/PORT/USER/PASS/FROM, MAIL_DRY_RUN=true → chỉ log, không gửi.
const nodemailer = require('nodemailer');

const DRY_RUN = String(process.env.MAIL_DRY_RUN || '').toLowerCase() === 'true';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
  return transporter;
}

async function sendMail({ to, cc, subject, html, attachments }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
  const atts = Array.isArray(attachments) && attachments.length ? attachments : undefined;
  if (DRY_RUN) {
    console.log(`[MAIL-DRY-RUN] to=${(to || []).join(',')} cc=${(cc || []).join(',')} subject=${subject} attachments=${atts ? atts.length : 0}`);
    return { dryRun: true, messageId: 'dry-run' };
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const e = new Error('Chưa cấu hình SMTP_USER/SMTP_PASS ở backend (.env)');
    e.status = 500;
    throw e;
  }
  const info = await getTransporter().sendMail({ from, to, cc: cc && cc.length ? cc : undefined, subject, html, attachments: atts });
  return { messageId: info.messageId };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const reminderHtml = (task) => `
<p>Kính gửi quý thầy/cô,</p>
<p>Công việc <strong>${esc(task.title)}</strong> đến hạn lúc <strong>${task.deadline ? new Date(task.deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'chưa rõ'}</strong>.</p>
<p>Trợ lý CTSV đề nghị quý thầy/cô kiểm tra và phản hồi trước thời hạn trên.</p>
<p>Trân trọng cảm ơn!</p>`;

const overdueHtml = (task) => `
<p>Kính gửi quý thầy/cô,</p>
<p>Công việc <strong>${esc(task.title)}</strong> đã <strong style="color:red">quá hạn</strong> (hạn: ${task.deadline ? new Date(task.deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'chưa rõ'}).</p>
<p>Trợ lý CTSV đề nghị quý thầy/cô cập nhật tiến độ sớm nhất có thể.</p>
<p>Trân trọng cảm ơn!</p>`;

module.exports = { sendMail, reminderHtml, overdueHtml, DRY_RUN };
