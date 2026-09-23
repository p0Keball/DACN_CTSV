import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm, Tag, Upload, Divider, Drawer, Tabs, Descriptions, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, InboxOutlined, LinkOutlined, SendOutlined, SaveOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import {
  getTasks, addTask, updateTask, deleteTask, addTaskAttachmentLink, uploadTaskFiles,
  getTaskAttachments, getTaskRecipients, addTaskRecipient, deleteRecipient,
  getTaskHistory, sendTaskEmail, getClasses, getTeachers,
} from '../services/api';
import { useLocation } from 'react-router-dom';

const { Dragger } = Upload;

// Status chuẩn §3.1 (vòng đời email)
const STATUS_OPTIONS = ['Mới tạo', 'Đã soạn', 'Đã gửi', 'Chờ phản hồi', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];
const TASK_TYPE_OPTIONS = [
  { value: 'ThongBaoDon', label: 'Thông báo đơn (soạn + gửi là xong)' },
  { value: 'ChienDichPhanCong', label: 'Chiến dịch phân công (cần chọn lớp / theo dõi SV)' },
];

interface Task {
  id: number;
  title: string;
  content: string;
  deadline: string;
  priority: string;
  status: string;
  source: string;
  semester: string;
  task_type?: string;
  ref_doc_number?: string;
  ref_issue_date?: string;
  remind_before_days?: number;
}

interface Recipient {
  id?: number;
  recipient_email: string;
  recipient_name?: string;
  recipient_group?: string;
}

interface Attachment {
  id: number;
  file_name: string;
  file_url: string;
  file_type?: string;
}

interface HistoryRow {
  id: number;
  recipient_email: string;
  subject: string;
  send_type?: string;
  status: string;
  sent_at?: string;
  created_at?: string;
}

const statusColor = (status: string) => {
  if (status === 'Hoàn thành') return 'success';
  if (status === 'Quá hạn') return 'error';
  if (status === 'Đã gửi') return 'cyan';
  if (status === 'Chờ phản hồi') return 'purple';
  if (status === 'Đã soạn') return 'gold';
  return 'processing';
};

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [sourceWatch, setSourceWatch] = useState<string>('Thủ công');
  const [taskTypeWatch, setTaskTypeWatch] = useState<string>('ThongBaoDon');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [recipDrafts, setRecipDrafts] = useState<Recipient[]>([]);
  const [recipEmail, setRecipEmail] = useState('');
  const [recipName, setRecipName] = useState('');
  const [classes, setClasses] = useState<Array<{ class_code: string; class_name: string; teacher_id: number | null; teacher_name: string | null }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: number; full_name: string; email: string }>>([]);

  const [isAssignVisible, setIsAssignVisible] = useState(false);
  const [currentAssignTask, setCurrentAssignTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchKeyword = searchParams.get('search')?.toLowerCase() || '';
  const filterHk = searchParams.get('hk') || '';
  const filterYear = searchParams.get('year') || '';

  const filteredTasks = tasks.filter(task => {
    const matchSearch = (task.title || '').toLowerCase().includes(searchKeyword);
    const matchHk = filterHk ? (task.semester || '').includes(filterHk) : true;
    const matchYear = filterYear ? (task.semester || '').includes(filterYear) : true;
    return matchSearch && matchHk && matchYear;
  });

  const loadTasks = useCallback(async () => {
    const res = await getTasks();
    if (res.success) setTasks(res.data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => { if (isMounted) await loadTasks(); };
    fetchData();
    return () => { isMounted = false; };
  }, [loadTasks]);

  useEffect(() => {
    getClasses().then(res => { if (res.success) setClasses(res.data); }).catch(() => undefined);
    getTeachers().then(res => { if (res.success) setTeachers(res.data); }).catch(() => undefined);
  }, []);

  const teacherById = (id: number | null) => teachers.find(t => t.id === id);

  const openAddForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ source: 'Thủ công', task_type: 'ThongBaoDon', priority: 'Bình thường', remind_before_days: 0 });
    setSourceWatch('Thủ công');
    setTaskTypeWatch('ThongBaoDon');
    setFileList([]);
    setRecipDrafts([]);
    setRecipEmail('');
    setRecipName('');
    setIsModalVisible(true);
  };

  const openEditForm = async (record: Task) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      deadline: record.deadline ? dayjs(record.deadline) : null,
      ref_issue_date: record.ref_issue_date ? dayjs(record.ref_issue_date) : null,
    });
    setSourceWatch(record.source || 'Thủ công');
    setTaskTypeWatch(record.task_type || 'ThongBaoDon');
    setFileList([]);
    try {
      const res = await getTaskRecipients(record.id);
      if (res.success) setRecipDrafts(res.data);
      else setRecipDrafts([]);
    } catch { setRecipDrafts([]); }
    setIsModalVisible(true);
  };

  const openAssignDrawer = async (record: Task) => {
    setCurrentAssignTask(record);
    setIsAssignVisible(true);
    try {
      const [att, rec, his] = await Promise.all([
        getTaskAttachments(record.id), getTaskRecipients(record.id), getTaskHistory(record.id),
      ]);
      if (att.success) setAttachments(att.data);
      if (rec.success) setRecipients(rec.data);
      if (his.success) setHistory(his.data);
    } catch { message.error('Không tải được chi tiết công việc'); }
  };

  const addDraftRecipient = () => {
    const email = recipEmail.trim();
    if (!email || !email.includes('@')) { message.warning('Nhập email người nhận hợp lệ'); return; }
    if (recipDrafts.some(r => r.recipient_email.toLowerCase() === email.toLowerCase())) {
      message.warning('Email này đã có trong danh sách'); return;
    }
    setRecipDrafts(prev => [...prev, { recipient_email: email, recipient_name: recipName.trim() || undefined, recipient_group: 'Tay' }]);
    setRecipEmail('');
    setRecipName('');
  };

  const addAllGvcn = () => {
    const withEmail = teachers.filter(t => t.email);
    if (withEmail.length === 0) { message.warning('Chưa có GVCN nào có email'); return; }
    setRecipDrafts(prev => {
      const existing = new Set(prev.map(r => r.recipient_email.toLowerCase()));
      const adds = withEmail
        .filter(t => !existing.has(t.email.toLowerCase()))
        .map(t => ({ recipient_email: t.email, recipient_name: t.full_name, recipient_group: 'Toàn thể GVCN' }));
      return [...prev, ...adds];
    });
    message.success(`Đã thêm ${withEmail.length} GVCN vào người nhận`);
  };

  const addGvcnOfClass = (classCode: string) => {
    const cls = classes.find(c => c.class_code === classCode);
    if (!cls?.teacher_id) { message.warning(`Lớp ${classCode} chưa gán GVCN`); return; }
    const t = teacherById(cls.teacher_id);
    if (!t?.email) { message.warning('GVCN chưa có email'); return; }
    if (recipDrafts.some(r => r.recipient_email.toLowerCase() === t.email.toLowerCase())) {
      message.warning('Đã có trong danh sách'); return;
    }
    setRecipDrafts(prev => [...prev, { recipient_email: t.email, recipient_name: `${t.full_name} (GVCN ${classCode})`, recipient_group: 'GVCN' }]);
  };

  const suggestContent = () => {
    const trichYeu = form.getFieldValue('content') || '';
    const refNo = form.getFieldValue('ref_doc_number') || '';
    if (!trichYeu && !refNo) { message.info('Nhập trích yếu / số văn bản eOffice trước để gợi ý'); return; }
    const draft = `Kính gửi quý thầy/cô,\n\nCăn cứ văn bản ${refNo ? `số ${refNo}` : 'của nhà trường'} với nội dung: "${trichYeu}".\n\nTrợ lý CTSV đề nghị quý thầy/cô phối hợp thực hiện và phản hồi trước deadline nêu trên.\n\nTrân trọng cảm ơn!`;
    form.setFieldsValue({ content: draft });
    message.success('Đã gợi ý nội dung email — bạn sửa lại trước khi gửi');
  };

  // persistTask: lưu task + recipients + attachments, trả về taskId
  const persistTask = async (status: string): Promise<number> => {
    const values = await form.validateFields();
    const deadlineValue = values.deadline as unknown as { toISOString: () => string } | null;
    const refDateValue = values.ref_issue_date as unknown as { format: (f: string) => string } | null;
    const payload = {
      ...values,
      deadline: deadlineValue ? (deadlineValue as unknown as { toISOString: () => string }).toISOString() : null,
      ref_issue_date: refDateValue ? dayjs((refDateValue as unknown as { toISOString?: () => string }).toISOString ? (refDateValue as unknown as { toISOString: () => string }).toISOString() : undefined).format('YYYY-MM-DD') : (values.ref_issue_date ? dayjs(values.ref_issue_date).format('YYYY-MM-DD') : null),
      status,
    };
    delete (payload as Record<string, unknown>).drive_link;

    const taskRes = editingId ? await updateTask(editingId, payload) : await addTask(payload);
    if (!taskRes.success) throw new Error('Lỗi khi lưu công việc');
    const taskId: number = editingId || taskRes.data.id;

    // Đồng bộ recipients: lấy danh sách cũ, xóa cái bị gỡ, thêm cái mới
    if (editingId) {
      const oldRes = await getTaskRecipients(taskId);
      const oldList: Array<{ id: number; recipient_email: string }> = oldRes.success ? oldRes.data : [];
      const draftEmails = new Set(recipDrafts.map(r => r.recipient_email.toLowerCase()));
      for (const o of oldList) {
        if (!draftEmails.has(o.recipient_email.toLowerCase()) && (o as { id: number }).id) {
          await deleteRecipient((o as { id: number }).id);
        }
      }
      const oldEmails = new Set(oldList.map(o => o.recipient_email.toLowerCase()));
      for (const r of recipDrafts) {
        if (!oldEmails.has(r.recipient_email.toLowerCase())) {
          await addTaskRecipient(taskId, r);
        }
      }
    } else {
      for (const r of recipDrafts) {
        await addTaskRecipient(taskId, r);
      }
    }

    if (values.drive_link) {
      await addTaskAttachmentLink(taskId, values.drive_link as string);
    }
    if (fileList.length > 0) {
      const formData = new FormData();
      fileList.forEach(file => {
        const actualFile = file.originFileObj || file;
        formData.append('files', actualFile as unknown as Blob);
      });
      await uploadTaskFiles(taskId, formData);
    }
    return taskId;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistTask('Đã soạn');
      message.success('Đã lưu nháp (trạng thái: Đã soạn)');
      setIsModalVisible(false);
      setFileList([]);
      loadTasks();
    } catch {
      message.error('Có lỗi khi lưu nháp!');
    } finally { setSaving(false); }
  };

  const handleSend = async () => {
    if (recipDrafts.length === 0) { message.warning('Hãy thêm ít nhất 1 người nhận trước khi gửi'); return; }
    setSaving(true);
    try {
      const taskId = await persistTask('Đã soạn');
      const res = await sendTaskEmail(taskId, 'Gửi lần đầu');
      if (!res.success) throw new Error(res.message || 'Gửi thất bại');
      message.success(`Đã gửi email tới ${res.data.length} người nhận`);
      setIsModalVisible(false);
      setFileList([]);
      loadTasks();
    } catch (e) {
      message.error((e as Error).message || 'Có lỗi khi gửi email!');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const res = await deleteTask(id);
    if (res.success) { message.success('Xóa thành công!'); loadTasks(); }
    else message.error('Lỗi khi xóa');
  };

  const columns = [
    { title: 'Tiêu đề (Subject email)', dataIndex: 'title', key: 'title', width: '28%', render: (text: string) => <strong style={{ color: '#237804' }}>{text}</strong> },
    {
      title: 'Loại', dataIndex: 'task_type', key: 'task_type', width: '13%',
      render: (v: string) => v === 'ChienDichPhanCong' ? <Tag color="purple">Chiến dịch</Tag> : <Tag>Thông báo</Tag>,
    },
    { title: 'Học kỳ', dataIndex: 'semester', key: 'semester', width: '12%' },
    { title: 'Deadline', dataIndex: 'deadline', key: 'deadline', render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Không có' },
    { title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', render: (priority: string) => {
        const color = priority === 'Cao' ? 'red' : priority === 'Thấp' ? 'green' : 'orange';
        return <Tag color={color}>{priority}</Tag>;
      }
    },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag> },
    { title: 'Thao tác', key: 'action', width: '20%', render: (_: unknown, record: Task) => (
        <Space size="middle">
          <Button type="link" icon={<FileTextOutlined />} onClick={() => openAssignDrawer(record)}>Chi tiết</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditForm(record)} />
          <Popconfirm title="Xóa công việc này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Quản lý Công việc & Sự kiện</h2>
      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddForm} style={{ marginBottom: 16 }}>
          Soạn công việc mới
        </Button>
        <Table columns={columns} dataSource={filteredTasks} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      {/* MODAL SOẠN CÔNG VIỆC (bản chất: soạn email) */}
      <Modal
        title={editingId ? 'Sửa Công việc (soạn email)' : 'Soạn Công việc mới (soạn email)'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={760}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>Đóng</Button>,
          <Button key="draft" icon={<SaveOutlined />} loading={saving} onClick={handleSaveDraft}>Lưu nháp</Button>,
          <Button key="send" type="primary" icon={<SendOutlined />} loading={saving} onClick={handleSend}>Lưu & Gửi email</Button>,
        ]}
      >
        <Form form={form} layout="vertical" initialValues={{ source: 'Thủ công', task_type: 'ThongBaoDon', priority: 'Bình thường', remind_before_days: 0 }}>
          <Space style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="source" label="Nguồn công việc" style={{ width: '220px' }}>
              <Select onChange={(v) => setSourceWatch(v)} options={[
                { value: 'Thủ công', label: 'Tạo thủ công' },
                { value: 'E-Office', label: 'Từ văn bản eOffice' },
                { value: 'OCR PDF', label: 'Trích xuất AI (OCR)' },
              ]} />
            </Form.Item>
            <Form.Item name="task_type" label="Loại công việc" style={{ width: '380px' }}>
              <Select onChange={(v) => setTaskTypeWatch(v)} options={TASK_TYPE_OPTIONS} />
            </Form.Item>
          </Space>

          {sourceWatch === 'E-Office' && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }} title="Tài liệu tham chiếu eOffice">
              <Space style={{ display: 'flex', gap: '16px' }} wrap>
                <Form.Item name="ref_doc_number" label="Số đến/đi" style={{ marginBottom: 8 }}>
                  <Input placeholder="VD: 1575/KH-ĐHĐL" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item name="ref_issue_date" label="Ngày ban hành" style={{ marginBottom: 8 }}>
                  <DatePicker format="DD/MM/YYYY" style={{ width: 180 }} />
                </Form.Item>
              </Space>
              <Button size="small" onClick={suggestContent}>Gợi ý nội dung email từ trích yếu</Button>
            </Card>
          )}

          <Form.Item name="title" label="Tiêu đề (dùng làm Subject email)" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="VD: Huy động SV dự Lễ khai giảng HK1 2026-2027" />
          </Form.Item>
          <Form.Item name="content" label="Nội dung (dùng làm Body email)">
            <Input.TextArea rows={5} placeholder="Soạn nội dung email gửi cho người nhận..." />
          </Form.Item>

          <Divider plain>Người nhận</Divider>
          <Space style={{ marginBottom: 8 }} wrap>
            <Button size="small" onClick={addAllGvcn}>+ Toàn thể GVCN</Button>
            <Select
              size="small"
              style={{ width: 260 }}
              placeholder="Thêm GVCN của lớp..."
              options={classes.map(c => ({ value: c.class_code, label: `${c.class_code}${c.teacher_name ? ` — ${c.teacher_name}` : ' (chưa gán GVCN)'}` }))}
              onChange={(v: string) => addGvcnOfClass(v)}
              value={undefined}
            />
          </Space>
          <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
            <Input placeholder="Email người nhận" value={recipEmail} onChange={e => setRecipEmail(e.target.value)} />
            <Input placeholder="Tên (tùy chọn)" value={recipName} onChange={e => setRecipName(e.target.value)} />
            <Button type="dashed" onClick={addDraftRecipient}>Thêm</Button>
          </Space.Compact>
          <div style={{ marginBottom: 8 }}>
            {recipDrafts.map(r => (
              <Tag key={r.recipient_email} closable onClose={() => setRecipDrafts(prev => prev.filter(x => x.recipient_email !== r.recipient_email))} style={{ marginBottom: 4 }}>
                {r.recipient_name ? `${r.recipient_name} <${r.recipient_email}>` : r.recipient_email}
              </Tag>
            ))}
            {recipDrafts.length === 0 && <span style={{ color: '#999', fontSize: 12 }}>Chưa có người nhận — email chưa gửi được</span>}
          </div>

          {taskTypeWatch === 'ChienDichPhanCong' && (
            <Alert
              style={{ marginBottom: 12 }}
              type="warning"
              showIcon
              message="Chiến dịch phân công: sau khi gửi email, theo dõi danh sách đăng ký ở trang chi tiết"
            />
          )}

          <Space style={{ display: 'flex', gap: '24px' }} wrap>
            <Form.Item name="deadline" label="Deadline" rules={[{ required: true, message: 'Chọn deadline' }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '210px' }} />
            </Form.Item>
            <Form.Item name="remind_before_days" label="Nhắc trước hạn (ngày)">
              <InputNumber min={0} max={30} />
            </Form.Item>
            <Form.Item name="priority" label="Ưu tiên">
              <Select style={{ width: '150px' }} options={[{ value: 'Cao', label: 'Cao' }, { value: 'Bình thường', label: 'Bình thường' }, { value: 'Thấp', label: 'Thấp' }]} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', gap: '24px' }} wrap>
            <Form.Item name="semester" label="Học kỳ" rules={[{ required: true, message: 'Chọn học kỳ' }]}>
              <Select style={{ width: '200px' }} placeholder="VD: HK1 2026-2027" options={[
                { value: 'HK1 2025-2026', label: 'HK1 2025-2026' },
                { value: 'HK2 2025-2026', label: 'HK2 2025-2026' },
                { value: 'HK1 2026-2027', label: 'HK1 2026-2027' },
              ]} />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái (tự động khi Gửi)">
              <Select style={{ width: '180px' }} options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />
            </Form.Item>
          </Space>

          <Divider plain>Tài liệu đính kèm (gửi kèm email)</Divider>
          <Form.Item name="drive_link" label="Link Google Sheets / Docs (nếu có)">
            <Input prefix={<LinkOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Dán link để người nhận điền danh sách..." />
          </Form.Item>
          <Form.Item label="Tải lên file đính kèm (PDF, Word, Excel...)">
            <Dragger
              name="file"
              multiple={true}
              fileList={fileList}
              onRemove={(file) => { setFileList(prev => prev.filter(f => f.uid !== file.uid)); }}
              beforeUpload={(file) => { setFileList(prev => [...prev, file]); return false; }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Nhấp hoặc kéo thả file vào đây</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      {/* DRAWER CHI TIẾT: email + lịch sử gửi */}
      <Drawer
        title={currentAssignTask ? `Công việc: ${currentAssignTask.title}` : 'Chi tiết công việc'}
        width={860}
        onClose={() => setIsAssignVisible(false)}
        open={isAssignVisible}
        destroyOnClose
      >
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: '1. Email & Tài liệu',
              children: (
                <div>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Trạng thái"><Tag color={statusColor(currentAssignTask?.status || '')}>{currentAssignTask?.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Loại">{currentAssignTask?.task_type === 'ChienDichPhanCong' ? 'Chiến dịch phân công' : 'Thông báo đơn'}</Descriptions.Item>
                    <Descriptions.Item label="Deadline">{currentAssignTask?.deadline ? dayjs(currentAssignTask.deadline).format('DD/MM/YYYY HH:mm') : 'Không có'}</Descriptions.Item>
                    {currentAssignTask?.source === 'E-Office' && (
                      <Descriptions.Item label="Tham chiếu eOffice">
                        {currentAssignTask?.ref_doc_number || '—'}{currentAssignTask?.ref_issue_date ? ` — ${dayjs(currentAssignTask.ref_issue_date).format('DD/MM/YYYY')}` : ''}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Nội dung email">{currentAssignTask?.content || 'Không có mô tả'}</Descriptions.Item>
                  </Descriptions>
                  <Divider>Người nhận ({recipients.length})</Divider>
                  <div style={{ marginBottom: 12 }}>
                    {recipients.map(r => (
                      <Tag key={r.id || r.recipient_email} style={{ marginBottom: 4 }}>
                        {(r as Recipient).recipient_name ? `${(r as Recipient).recipient_name} <${(r as Recipient).recipient_email}>` : (r as Recipient).recipient_email}
                      </Tag>
                    ))}
                    {recipients.length === 0 && <span style={{ color: '#999' }}>Chưa có người nhận</span>}
                  </div>
                  <Divider>Tập tin đính kèm</Divider>
                  <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Space direction="vertical">
                      {attachments.map(a => (
                        <Button key={a.id} type="link" href={a.file_url} target="_blank" icon={<FileTextOutlined />}>{a.file_name}</Button>
                      ))}
                      {attachments.length === 0 && <span style={{ color: '#999' }}>Chưa có file đính kèm</span>}
                    </Space>
                  </Card>
                </div>
              ),
            },
            {
              key: '2',
              label: '2. Lịch sử gửi',
              children: (
                <Table
                  pagination={false}
                  rowKey="id"
                  columns={[
                    { title: 'Thời gian', dataIndex: 'sent_at', render: (v: string, row: HistoryRow) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : (row.created_at ? dayjs(row.created_at).format('DD/MM/YYYY HH:mm') : '—') },
                    { title: 'Người nhận', dataIndex: 'recipient_email' },
                    { title: 'Loại gửi', dataIndex: 'send_type', render: (v: string) => v || 'Gửi lần đầu' },
                    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color="cyan">{v}</Tag> },
                  ]}
                  dataSource={history}
                  locale={{ emptyText: 'Chưa gửi email nào cho công việc này' }}
                />
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
};

export default Tasks;
