import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Collapse, Table, Button, Modal, Tag, Tooltip, message, Popconfirm, Space } from 'antd';
import {
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileImageOutlined,
  FileOutlined, LinkOutlined, DownloadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getFilesLibrary, searchFiles, getTaskAttachments, deleteAttachment,
} from '../services/api';

interface LibraryTask {
  id: number;
  title: string;
  created_at: string;
  source: string;
  file_count: string;
}

interface LibraryMonth {
  month: string; // YYYY-MM
  tasks: LibraryTask[];
}

interface FileRow {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: string;
  task_id: number;
  task_title: string;
  task_created: string;
  source: string;
}

const TYPE_OPTIONS = [
  { value: '', label: 'Mọi loại file' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'link', label: 'Link Drive/Docs' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Mọi nguồn' },
  { value: 'Thủ công', label: 'Thủ công' },
  { value: 'E-Office', label: 'E-Office' },
  { value: 'OCR PDF', label: 'OCR PDF' },
];

const trunc50 = (s: string) => (s && s.length > 50 ? `${s.slice(0, 50)}…` : s || '—');

const monthLabel = (ym: string) => {
  const d = dayjs(`${ym}-01`);
  return d.isValid() ? `Tháng ${d.format('MM/YYYY')}` : ym;
};

const formatSize = (v: string | null) => {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const fileIcon = (t: string) => {
  if (t === 'link') return <LinkOutlined style={{ color: '#1677ff' }} />;
  if (/pdf/i.test(t)) return <FilePdfOutlined style={{ color: '#f5222d' }} />;
  if (/word|doc/i.test(t)) return <FileWordOutlined style={{ color: '#1677ff' }} />;
  if (/sheet|xls/i.test(t)) return <FileExcelOutlined style={{ color: '#237804' }} />;
  if (/image/i.test(t)) return <FileImageOutlined style={{ color: '#722ed1' }} />;
  return <FileOutlined />;
};

// Tab Hồ sơ (/ho-so): tủ file trung tâm thay thư mục local theo tháng.
// File từ tab Công việc (upload tay, link Drive, sau này sync eOffice)
// đã nằm trong task_attachments nên tự hiện ở đây.
const RecordsPage: React.FC = () => {
  const [months, setMonths] = useState<LibraryMonth[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [fileType, setFileType] = useState('');
  const [source, setSource] = useState('');
  const [results, setResults] = useState<FileRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [fileModal, setFileModal] = useState<{ taskId: number; taskTitle: string } | null>(null);
  const [modalFiles, setModalFiles] = useState<FileRow[]>([]);

  useEffect(() => {
    getFilesLibrary()
      .then(res => { if (res.success) setMonths(res.data); })
      .catch(() => { message.error('Không tải được tủ hồ sơ'); })
      .finally(() => { setLoading(false); });
  }, []);

  const reloadLibrary = () => {
    getFilesLibrary()
      .then(res => { if (res.success) setMonths(res.data); })
      .catch(() => undefined);
  };

  const runSearch = (kw: string, type: string, src: string) => {
    setSearching(true);
    searchFiles({ q: kw || undefined, type: type || undefined, source: src || undefined })
      .then(res => { if (res.success) setResults(res.data); })
      .catch(() => { message.error('Không tìm được file'); })
      .finally(() => { setSearching(false); });
  };

  const submitSearch = () => {
    setSubmitted(keyword.trim());
    runSearch(keyword.trim(), fileType, source);
  };

  const openFiles = async (taskId: number, taskTitle: string) => {
    setFileModal({ taskId, taskTitle });
    try {
      const res = await getTaskAttachments(taskId);
      if (res.success) setModalFiles(res.data);
    } catch { message.error('Không tải được file đính kèm'); }
  };

  const handleDeleteFile = async (id: number) => {
    const res = await deleteAttachment(id);
    if (res.success) {
      message.success('Đã xóa file');
      setModalFiles(prev => prev.filter(f => f.id !== id));
      setResults(prev => prev.filter(f => f.id !== id));
      reloadLibrary();
    } else message.error('Lỗi khi xóa file');
  };

  const fileColumns = (showTask = false) => [
    {
      title: 'File', render: (_: unknown, r: FileRow) => (
        <Space>
          {fileIcon(`${r.file_type || ''} ${r.file_name || ''}`)}
          <a href={r.file_url} target="_blank" rel="noreferrer">{r.file_name}</a>
        </Space>
      ),
    },
    ...(showTask ? [{
      title: 'Công việc', render: (_: unknown, r: FileRow) => (
        <Tooltip title={r.task_title}>
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => openFiles(r.task_id, r.task_title)}>
            {trunc50(r.task_title)}
          </Button>
        </Tooltip>
      ),
    }] : []),
    { title: 'Dung lượng', dataIndex: 'file_size', width: 110, render: (v: string) => formatSize(v) },
    {
      title: '', width: 110,
      render: (_: unknown, r: FileRow) => (
        <Space>
          <Button type="link" size="small" icon={<DownloadOutlined />} href={r.file_url} target="_blank">Tải</Button>
          <Popconfirm title="Xóa file này?" onConfirm={() => handleDeleteFile(r.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const searching_mode = submitted !== '';

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Hồ sơ — Tủ file tập trung</h2>

      <Card size="small" style={{ marginBottom: 16, borderRadius: '8px' }}>
        <Space wrap>
          <Input.Search
            style={{ width: 300 }}
            placeholder="Tìm theo tên công việc / tên file..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onSearch={submitSearch}
            allowClear
          />
          <Select style={{ width: 150 }} value={fileType} onChange={v => { setFileType(v); if (submitted) runSearch(submitted, v, source); }} options={TYPE_OPTIONS} />
          <Select style={{ width: 150 }} value={source} onChange={v => { setSource(v); if (submitted) runSearch(submitted, fileType, v); }} options={SOURCE_OPTIONS} />
          {searching_mode && <Button onClick={() => { setKeyword(''); setSubmitted(''); }}>Về xem theo tháng</Button>}
        </Space>
      </Card>

      {searching_mode ? (
        <Card style={{ borderRadius: '8px' }}>
          <Table
            rowKey="id"
            loading={searching}
            pagination={{ pageSize: 15 }}
            columns={fileColumns(true)}
            dataSource={results}
            locale={{ emptyText: 'Không tìm thấy file nào' }}
          />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={months.length > 0 ? [months[0].month] : []}
          items={months.map(m => {
            const totalFiles = m.tasks.reduce((s, t) => s + Number(t.file_count), 0);
            return {
              key: m.month,
              label: <strong>{monthLabel(m.month)} <Tag style={{ marginLeft: 8 }}>{totalFiles} file</Tag></strong>,
              children: (
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'STT', width: 60,
                      render: (_: unknown, _r: LibraryTask, i: number) => String(i + 1).padStart(2, '0'),
                    },
                    {
                      title: 'Công việc',
                      render: (_: unknown, r: LibraryTask) => (
                        <Tooltip title={r.title}>
                          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => openFiles(r.id, r.title)}>
                            {trunc50(r.title)}
                          </Button>
                        </Tooltip>
                      ),
                    },
                    {
                      title: 'Ngày tạo', width: 120,
                      render: (_: unknown, r: LibraryTask) => r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY') : '—',
                    },
                    { title: 'Số file', dataIndex: 'file_count', width: 90 },
                  ]}
                  dataSource={m.tasks}
                  locale={{ emptyText: 'Tháng này chưa có file' }}
                />
              ),
            };
          })}
        />
      )}
      {!searching_mode && !loading && months.length === 0 && (
        <Card style={{ borderRadius: '8px', textAlign: 'center', color: '#999' }}>
          Chưa có file nào — thêm file đính kèm ở tab Công việc để file tự hiện ở đây
        </Card>
      )}

      <Modal
        title={fileModal ? `File đính kèm — ${trunc50(fileModal.taskTitle)}` : 'File đính kèm'}
        open={!!fileModal}
        onCancel={() => setFileModal(null)}
        footer={[<Button key="close" onClick={() => setFileModal(null)}>Đóng</Button>]}
        width={720}
      >
        <Table rowKey="id" pagination={false} columns={fileColumns(false)} dataSource={modalFiles} locale={{ emptyText: 'Công việc này chưa có file' }} />
      </Modal>
    </div>
  );
};

export default RecordsPage;
