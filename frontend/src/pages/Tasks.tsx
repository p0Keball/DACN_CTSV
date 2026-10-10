import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Space, Card, message, Popconfirm, Tag, Divider, Drawer, Tabs, Descriptions, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DOMPurify from 'dompurify';
import {
  getTasks, deleteTask,
  getTaskAttachments, getTaskRecipients, getTaskHistory,
  getTaskParticipants, updateParticipant, deleteParticipant,
} from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { statusColor, PARTICIPANT_STATUSES } from '../types';
import type { Task, Recipient, Attachment, HistoryRow, Participant } from '../types';

interface TasksListProps {
  onNew: () => void;
  onEdit: (task: Task) => void;
  /** Tăng số này để bắt danh sách tải lại (vd sau khi tab soạn lưu xong). */
  refreshToken?: number;
}

// Danh sách công việc (bảng + Drawer chi tiết). Soạn/sửa do tab cha mở.
const Tasks: React.FC<TasksListProps> = ({ onNew, onEdit, refreshToken }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isAssignVisible, setIsAssignVisible] = useState(false);
  const [currentAssignTask, setCurrentAssignTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchKeyword = searchParams.get('search')?.toLowerCase() || '';
  const filterHk = searchParams.get('hk') || '';
  const filterYear = searchParams.get('year') || '';
  // Deep-link từ Lịch / Hồ sơ SV / Thông báo: ?taskId=... → tự mở Drawer chi tiết
  const taskIdParam = searchParams.get('taskId');
  const autoOpened = useRef<string | null>(null);

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
  }, [loadTasks, refreshToken]);

  const openAssignDrawer = useCallback(async (record: Task) => {
    setCurrentAssignTask(record);
    setIsAssignVisible(true);
    try {
      const [att, rec, his, part] = await Promise.all([
        getTaskAttachments(record.id), getTaskRecipients(record.id), getTaskHistory(record.id),
        getTaskParticipants(record.id),
      ]);
      if (att.success) setAttachments(att.data);
      if (rec.success) setRecipients(rec.data);
      if (his.success) setHistory(his.data);
      if (part.success) setParticipants(part.data);
    } catch { message.error('Không tải được chi tiết công việc'); }
  }, []);

  // ?taskId=... (từ Lịch / Hồ sơ SV / chuông thông báo) → mở Drawer khi bảng đã tải xong
  useEffect(() => {
    if (!taskIdParam) { autoOpened.current = null; return; }
    if (autoOpened.current === taskIdParam) return;
    const found = tasks.find(t => String(t.id) === taskIdParam);
    if (!found) return;
    autoOpened.current = taskIdParam;
    Promise.resolve()
      .then(() => openAssignDrawer(found))
      .catch(() => undefined);
  }, [taskIdParam, tasks, openAssignDrawer]);

  // Đóng Drawer thì gỡ taskId khỏi URL để bấm lại link đó vẫn mở được
  const closeAssignDrawer = () => {
    setIsAssignVisible(false);
    if (taskIdParam) {
      const sp = new URLSearchParams(location.search);
      sp.delete('taskId');
      const search = sp.toString();
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
    }
  };

  const reloadParticipants = async (taskId: number) => {
    try {
      const res = await getTaskParticipants(taskId);
      if (res.success) setParticipants(res.data);
    } catch { message.error('Không tải được danh sách phân công'); }
  };

  const handleParticipantStatus = async (p: Participant, status: string) => {
    const res = await updateParticipant(p.id, { status });
    if (res.success) {
      message.success(`Đã cập nhật ${p.student_id} → ${status}`);
      if (currentAssignTask) reloadParticipants(currentAssignTask.id);
    } else message.error('Lỗi khi cập nhật trạng thái');
  };

  const handleParticipantDelete = async (p: Participant) => {
    const res = await deleteParticipant(p.id);
    if (res.success) {
      message.success(`Đã gỡ ${p.student_id} khỏi phân công`);
      if (currentAssignTask) reloadParticipants(currentAssignTask.id);
    } else message.error('Lỗi khi gỡ phân công');
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
          <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Popconfirm title="Xóa công việc này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onNew} style={{ marginBottom: 16 }}>
          Soạn công việc mới
        </Button>
        <Table columns={columns} dataSource={filteredTasks} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      {/* DRAWER CHI TIẾT: email + lịch sử gửi */}
      <Drawer
        title={currentAssignTask ? `Công việc: ${currentAssignTask.title}` : 'Chi tiết công việc'}
        size={860}
        onClose={closeAssignDrawer}
        open={isAssignVisible}
        destroyOnHidden
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
                    <Descriptions.Item label="Nội dung email">
                      {currentAssignTask?.content
                        ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAssignTask.content) }} />
                        : 'Không có mô tả'}
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider>Người nhận ({recipients.length})</Divider>
                  <div style={{ marginBottom: 12 }}>
                    {recipients.map(r => (
                      <Tag key={r.id || r.recipient_email} style={{ marginBottom: 4 }} color={r.kind === 'cc' ? 'purple' : undefined}>
                        {r.kind === 'cc' ? '[Cc] ' : ''}{r.recipient_name ? `${r.recipient_name} <${r.recipient_email}>` : r.recipient_email}
                      </Tag>
                    ))}
                    {recipients.length === 0 && <span style={{ color: '#999' }}>Chưa có người nhận</span>}
                  </div>
                  <Divider>Tập tin đính kèm</Divider>
                  <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Space orientation="vertical">
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
            {
              key: '3',
              label: `3. Phân công (${participants.length})`,
              children: (
                <Table
                  pagination={false}
                  rowKey="id"
                  columns={[
                    { title: 'MSSV', dataIndex: 'student_id', width: 110 },
                    {
                      title: 'Họ tên',
                      render: (_: unknown, r: Participant) => `${r.FirstName || ''} ${r.LastName || ''}`.trim() || '—',
                    },
                    { title: 'Lớp', dataIndex: 'class_code', width: 90 },
                    {
                      title: 'Trạng thái tham gia',
                      width: 170,
                      render: (_: unknown, r: Participant) => (
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={r.status}
                          options={PARTICIPANT_STATUSES.map(s => ({ value: s, label: s }))}
                          onChange={(v) => handleParticipantStatus(r, v)}
                        />
                      ),
                    },
                    {
                      title: '', width: 50,
                      render: (_: unknown, r: Participant) => (
                        <Popconfirm title={`Gỡ ${r.student_id} khỏi phân công?`} onConfirm={() => handleParticipantDelete(r)}>
                          <Button type="link" danger size="small">Gỡ</Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                  dataSource={participants}
                  locale={{ emptyText: 'Chưa phân công sinh viên nào — thêm ở trang Soạn' }}
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
