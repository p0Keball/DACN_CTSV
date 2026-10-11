// Adapter eOffice (§3, luồng B tự động): tách lớp để đổi mock→thật chỉ cần đổi env.
// - EOFFICE_PROVIDER=mock|http (mặc định http — API clone đang sống, không cần auth)
// - EOFFICE_BASE_URL: base service eOffice (vd https://api-eoffice.nguyentronghieu.io.vn)
const axios = require('axios');

const BASE_URL = (process.env.EOFFICE_BASE_URL || 'https://api-eoffice.nguyentronghieu.io.vn').replace(/\/$/, '');
const PROVIDER = process.env.EOFFICE_PROVIDER || 'http';

const client = axios.create({ baseURL: BASE_URL, timeout: 20000 });

// Dữ liệu mẫu đúng shape API thật — dev offline / demo khi service chập chờn
const MOCK_DOCS = [
  {
    id: 'mock-doc-1',
    taskId: null,
    summaryHtml: 'Kế hoạch mẫu: Huy động sinh viên dự Lễ khai giảng năm học 2026-2027',
    summaryText: 'Kế hoạch mẫu: Huy động sinh viên dự Lễ khai giảng năm học 2026-2027',
    senderName: 'Văn thư Khoa CNTT',
    senderUnit: 'Khoa Công nghệ Thông tin',
    createdAt: '2026-09-05T07:15:00+07:00',
    updatedAt: '2026-09-05T07:15:00+07:00',
    attachmentCount: 1,
  },
  {
    id: 'mock-doc-2',
    taskId: null,
    summaryHtml: 'Thông báo mẫu: Rà soát danh sách khen thưởng cấp Khoa',
    summaryText: 'Thông báo mẫu: Rà soát danh sách khen thưởng cấp Khoa',
    senderName: 'Phòng CTSV',
    senderUnit: 'Phòng Công tác sinh viên',
    createdAt: '2026-09-04T08:00:00+07:00',
    updatedAt: '2026-09-04T08:00:00+07:00',
    attachmentCount: 0,
  },
];

const MOCK_DETAIL = {
  ...MOCK_DOCS[0],
  contentHtml: null,
  contentText: null,
  documentNumber: '1575',
  inboundNumber: '',
  outboundNumber: '1575',
  attachments: [],
};

const httpProvider = {
  async getDocuments(params = {}) {
    const res = await client.get('/api/v1/notifications', { params });
    return res.data;
  },
  async getDocumentDetail(id) {
    const res = await client.get(`/api/v1/notifications/${id}`);
    return res.data;
  },
  async downloadAttachment(notificationId, attachmentId) {
    const res = await client.get(
      `/api/v1/notifications/${notificationId}/attachments/${attachmentId}/download`,
      { responseType: 'arraybuffer' }
    );
    return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] };
  },
};

const mockProvider = {
  async getDocuments() {
    return {
      data: MOCK_DOCS,
      pageInfo: { page: 1, pageSize: MOCK_DOCS.length, pageCount: 1, totalRecordCount: MOCK_DOCS.length },
    };
  },
  async getDocumentDetail(id) {
    const found = MOCK_DOCS.find(d => d.id === id);
    if (!found) { const e = new Error('Không tìm thấy văn bản'); e.status = 404; throw e; }
    return { ...MOCK_DETAIL, ...found };
  },
  async downloadAttachment() {
    const e = new Error('Mock không có file thật để tải');
    e.status = 404;
    throw e;
  },
};

module.exports = PROVIDER === 'mock' ? mockProvider : httpProvider;
module.exports.PROVIDER = PROVIDER;
