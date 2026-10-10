import React, { useState, useEffect, useMemo } from 'react';
import { Badge, Popover, Button, Tag, Empty, Typography, message } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getTasks } from '../services/api';
import type { Task } from '../types';

const { Text } = Typography;

type NotifKind = 'overdue' | 'upcoming' | 'new';

interface Notif {
  id: string;
  taskId: number;
  kind: NotifKind;
  title: string;
  deadline?: string;
  priority?: string;
  status?: string;
}

// ID đã đọc lưu ở trình duyệt (app 1 admin, thông báo suy ra từ công việc nên không cần bảng DB).
const READ_KEY = 'ctsv_read_notifs';

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

const KIND_META: Record<NotifKind, { label: string; color: string; icon: React.ReactNode }> = {
  overdue: { label: 'Quá hạn', color: 'red', icon: <ExclamationCircleOutlined /> },
  upcoming: { label: 'Sắp đến hạn', color: 'orange', icon: <ClockCircleOutlined /> },
  new: { label: 'Mới', color: 'blue', icon: <FileAddOutlined /> },
};

// Chuông thông báo công việc: quá hạn / sắp đến hạn (≤3 ngày) / mới trong 7 ngày.
// Bấm chuông mở panel, mỗi thông báo có trạng thái đã đọc / chưa đọc.
const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const persist = (ids: Set<string>) => {
    setReadIds(ids);
    try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch { /* bỏ qua */ }
  };

  const reload = () => {
    getTasks()
      .then(res => { if (res.success) setTasks(res.data); })
      .catch(() => { message.error('Không tải được thông báo'); });
  };

  useEffect(() => { reload(); }, []);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) reload();
  };

  const notifs = useMemo<Notif[]>(() => {
    const now = dayjs();
    const list: Notif[] = [];
    for (const t of tasks) {
      const done = t.status === 'Hoàn thành';
      const dl = t.deadline ? dayjs(t.deadline) : null;
      if (!done && dl?.isValid()) {
        if (dl.isBefore(now)) {
          list.push({ id: `overdue-${t.id}`, taskId: t.id, kind: 'overdue', title: t.title, deadline: t.deadline, priority: t.priority, status: t.status });
          continue;
        }
        if (dl.diff(now, 'day') <= 3) {
          list.push({ id: `upcoming-${t.id}`, taskId: t.id, kind: 'upcoming', title: t.title, deadline: t.deadline, priority: t.priority, status: t.status });
          continue;
        }
      }
      // Công việc mới tạo/gửi trong 7 ngày (có deadline hoặc không)
      const created = (t as Task & { created_at?: string }).created_at;
      if (['Mới tạo', 'Mới', 'Đã soạn', 'Đã gửi'].includes(t.status || '') && (!created || dayjs(created).isAfter(now.subtract(7, 'day')))) {
        list.push({ id: `new-${t.id}`, taskId: t.id, kind: 'new', title: t.title, deadline: t.deadline, priority: t.priority, status: t.status });
      }
    }
    const order: Record<NotifKind, number> = { overdue: 0, upcoming: 1, new: 2 };
    return list.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 30);
  }, [tasks]);

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;
  const shown = tab === 'unread' ? notifs.filter(n => !readIds.has(n.id)) : notifs;

  const markAllRead = () => persist(new Set([...readIds, ...notifs.map(n => n.id)]));

  const openTask = (n: Notif) => {
    if (!readIds.has(n.id)) persist(new Set([...readIds, n.id]));
    setOpen(false);
    navigate(`/cong-viec?search=${encodeURIComponent(n.title)}`);
  };

  const panel = (
    <div style={{ width: 400, maxWidth: 'calc(100vw - 48px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ fontSize: 15 }}>Thông báo công việc</Text>
        <Button type="link" size="small" icon={<CheckOutlined />} disabled={unreadCount === 0} onClick={markAllRead}>
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0' }}>
        <Button size="small" type={tab === 'all' ? 'primary' : 'text'} onClick={() => setTab('all')}>
          Tất cả ({notifs.length})
        </Button>
        <Button size="small" type={tab === 'unread' ? 'primary' : 'text'} onClick={() => setTab('unread')}>
          Chưa đọc ({unreadCount})
        </Button>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 8px 12px' }}>
        {shown.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tab === 'unread' ? 'Không còn thông báo chưa đọc' : 'Chưa có thông báo nào'} />
        ) : shown.map(n => {
          const unread = !readIds.has(n.id);
          const meta = KIND_META[n.kind];
          return (
            <div
              key={n.id}
              onClick={() => openTask(n)}
              style={{
                display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: unread ? '#f0f9ec' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = unread ? '#e4f2dc' : '#f5f5f5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = unread ? '#f0f9ec' : 'transparent'; }}
            >
              <span style={{ fontSize: 18, color: meta.color === 'red' ? '#f5222d' : meta.color === 'orange' ? '#fa8c16' : '#1677ff', marginTop: 2 }}>
                {meta.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
                  {n.deadline && <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(n.deadline).format('DD/MM HH:mm')}</Text>}
                </div>
                <div style={{ fontWeight: unread ? 600 : 400, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {n.title}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {unread ? 'Chưa đọc' : 'Đã đọc'}{n.status ? ` • ${n.status}` : ''}
                </Text>
              </div>
              {unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1677ff', marginTop: 6, flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange} content={panel} trigger="click" placement="bottomRight" arrow={false}>
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
