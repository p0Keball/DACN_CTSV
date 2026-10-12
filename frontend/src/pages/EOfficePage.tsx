import React, { useState, useEffect } from 'react';
import { Card, Input, Table, Button, Tag, Drawer, Descriptions, message, Space, Tooltip } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getEofficeDocs, getEofficeDoc, createTaskFromEoffice } from '../services/api';

interface EofficeDoc {
  id: string;
  summaryText: string;
  senderName: string;
  senderUnit: string;
  createdAt: string;
  attachmentCount: number;
}

interface EofficeDetail extends EofficeDoc {
  contentText?: string | null;
  documentNumber?: string | null;
  inboundNumber?: string | null;
  outboundNumber?: string | null;
  attachments?: Array<{
    id: string;
    fileName: string;
    extension: string;
    sizeBytes?: number | null;
    relationshipType: string;
    available: boolean;
  }>;
}

const trunc120 = (s: string) => (s && s.length > 120 ? `${s.slice(0, 120)}…` : s || '—');

// Trang eOffice (/eoffice, menu riêng): duyệt văn bản + 1 click tạo công việc.
// Tạo xong sang tab Sửa để soạn email + chọn người nhận như luồng thường.
const EOfficePage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<EofficeDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const [detail, setDetail] = useState<EofficeDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Đổi trang/từ khóa → tự tải lại
  useEffect(() => {
    getEofficeDocs({ page, pageSize: 15, q: keyword || undefined })
      .then(res => {
        if (res.success) {
          setDocs(res.data);
          setTotal(res.pageInfo?.totalRecordCount || 0);
        }
      })
      .catch(() => { message.error('Không kết nối được service eOffice'); })
      .finally(() => { setLoading(false); });
  }, [page, keyword]);

  const submitSearch = (q: string) => {
    setKeyword(q);
    setPage(1);
  };

  const openDetail = async (id: string) => {
    try {
      const res = await getEofficeDoc(id);
      if (res.success) { setDetail(res.data); setDrawerOpen(true); }
    } catch { message.error('Không tải được chi tiết văn bản'); }
  };

  const handleCreateTask = async () => {
    if (!detail) return;
    setCreating(true);
    try {
      const res = await createTaskFromEoffice(detail.id);
      if (!res.success) throw new Error(res.message);
      if (res.existed) {
        message.info('Văn bản này đã tạo công việc từ trước — mở công việc cũ');
      } else {
        const { added = 0, skipped = [] } = res.attachments || {};
        message.success(`Đã tạo công việc + tải ${added} file đính kèm${skipped.length ? ` (${skipped.length} file bỏ qua)` : ''}`);
      }
      setDrawerOpen(false);
      navigate('/cong-viec', { state: { openEditTaskId: res.data.id } });
    } catch (e) {
      message.error((e as Error).message || 'Không tạo được công việc');
    } finally { setCreating(false); }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>eOffice — Văn bản đến</h2>
      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Input.Search
          style={{ width: 360, marginBottom: 16 }}
          placeholder="Tìm theo trích yếu (không dấu cũng được)..."
          onSearch={submitSearch}
          allowClear
        />
        <Table
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 15, total, onChange: setPage }}
          onRow={(r) => ({ onClick: () => openDetail(r.id), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: 'Trích yếu',
              dataIndex: 'summaryText',
              render: (v: string) => <Tooltip title={v}><span>{trunc120(v)}</span></Tooltip>,
            },
            { title: 'Nơi gửi', dataIndex: 'senderName', width: 180 },
            {
              title: 'Ngày BH', dataIndex: 'createdAt', width: 120,
              render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
            },
            {
              title: 'File', dataIndex: 'attachmentCount', width: 80,
              render: (v: number) => (v > 0 ? <Tag icon={<FileTextOutlined />}>{v}</Tag> : <span style={{ color: '#bbb' }}>0</span>),
            },
          ]}
          dataSource={docs}
          locale={{ emptyText: 'Không có văn bản nào' }}
        />
      </Card>

      <Drawer
        title="Chi tiết văn bản eOffice"
        size={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={handleCreateTask}>
            Tạo công việc
          </Button>
        }
      >
        {detail && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Trích yếu">{detail.summaryText}</Descriptions.Item>
              <Descriptions.Item label="Nơi gửi">{detail.senderName} — {detail.senderUnit}</Descriptions.Item>
              <Descriptions.Item label="Số văn bản">
                {[detail.outboundNumber, detail.documentNumber, detail.inboundNumber].filter(Boolean).join(' / ') || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày BH">
                {detail.createdAt ? dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <strong>File đính kèm ({detail.attachments?.length || 0})</strong>
              {(detail.attachments || []).map(a => (
                <div key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                  <FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                  {a.fileName}
                  <Tag style={{ marginLeft: 8 }}>{a.relationshipType}</Tag>
                  {!a.available && <Tag color="warning">gốc không còn</Tag>}
                </div>
              ))}
              {(detail.attachments || []).length === 0 && <div style={{ color: '#999' }}>Văn bản không có file</div>}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              Bấm “Tạo công việc” để chuyển thành task (nguồn E-Office) + tự tải file về — rồi soạn email như bình thường.
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default EOfficePage;
