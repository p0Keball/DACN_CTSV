import React, { useMemo, useState } from 'react';
import { Tag, Popover, Button, List, Empty } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface TaskItem {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  [key: string]: unknown;
}

interface DataSectionsProps {
  tasks?: TaskItem[];
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const toDayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const fmtDate = (y: number, m: number, d: number) =>
  `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
const fmtTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const priorityColor = (p: string) =>
  p === 'Cao' ? 'red' : p === 'Trung bình' ? 'orange' : 'green';
const statusColor = (s: string) =>
  s === 'Hoàn thành' ? 'success' : s === 'Đang xử lý' ? 'processing' : 'default';

// Khối "Công việc gần đây": 2 cột — trái là lịch tháng này,
// di chuột / bấm vào ô ngày thì cột phải hiện công việc của ngày đó.
const DataSections: React.FC<DataSectionsProps> = ({ tasks = [] }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [active, setActive] = useState({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() });

  // Gom công việc theo ngày deadline
  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const d = new Date(t.deadline);
      if (Number.isNaN(d.getTime())) return;
      const k = toDayKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
    map.forEach((list) =>
      list.sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    );
    return map;
  }, [tasks]);

  // Ô lưới lịch (null = ô trống đầu/cuối tháng), tuần bắt đầu T2
  const cells = useMemo(() => {
    const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [
      ...Array<number | null>(offset).fill(null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const shift = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const goToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setActive({ y: n.getFullYear(), m: n.getMonth(), d: n.getDate() });
  };

  const activeKey = `${active.y}-${active.m}-${active.d}`;
  const activeTasks = tasksByDay.get(activeKey) ?? [];

  const dayPopover = (day: number) => {
    const list = tasksByDay.get(`${viewYear}-${viewMonth}-${day}`) ?? [];
    if (list.length === 0) return <span style={{ color: '#999' }}>Không có công việc nào</span>;
    return (
      <List
        size="small"
        style={{ maxWidth: 280 }}
        dataSource={list}
        renderItem={(t) => (
          <List.Item key={t.id} style={{ padding: '4px 0' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{t.title}</div>
              <div style={{ marginTop: 2 }}>
                <Tag color={priorityColor(t.priority)}>{t.priority || '—'}</Tag>
                <Tag color={statusColor(t.status)}>{t.status || '—'}</Tag>
                <span style={{ color: '#888', fontSize: 12 }}>{fmtTime(t.deadline)}</span>
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ marginTop: '24px', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '20px' }}>Công việc gần đây</h3>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* BÊN TRÁI: lịch tháng này */}
        <div style={{ flex: '1 1 480px', minWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <strong>Lịch tháng {viewMonth + 1}/{viewYear}</strong>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button size="small" icon={<LeftOutlined />} onClick={() => shift(-1)} />
              <Button size="small" onClick={goToday}>Hôm nay</Button>
              <Button size="small" icon={<RightOutlined />} onClick={() => shift(1)} />
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12, fontWeight: 600, padding: '4px 0' }}>
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const list = tasksByDay.get(`${viewYear}-${viewMonth}-${day}`) ?? [];
              const isToday =
                today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              const isActive = active.y === viewYear && active.m === viewMonth && active.d === day;
              return (
                <Popover
                  key={i}
                  title={`${fmtDate(viewYear, viewMonth, day)} (${list.length} việc)`}
                  content={dayPopover(day)}
                  trigger="hover"
                  mouseEnterDelay={0.3}
                >
                  <div
                    onMouseEnter={() => setActive({ y: viewYear, m: viewMonth, d: day })}
                    onClick={() => setActive({ y: viewYear, m: viewMonth, d: day })}
                    style={{
                      minHeight: 64,
                      border: isActive ? '2px solid #237804' : '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: 4,
                      cursor: 'pointer',
                      background: isToday ? '#f6ffed' : '#fff',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: isToday || isActive ? 700 : 400, color: isToday ? '#237804' : 'inherit' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
                      {list.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          title={t.title}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            display: 'inline-block',
                            background: t.priority === 'Cao' ? '#f5222d' : t.priority === 'Trung bình' ? '#faad14' : '#52c41a',
                          }}
                        />
                      ))}
                    </div>
                    {list.length > 0 && (
                      <div style={{ fontSize: 10, color: '#595959', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {list[0].title}
                      </div>
                    )}
                    {list.length > 1 && <div style={{ fontSize: 10, color: '#8c8c8c' }}>+{list.length - 1} nữa</div>}
                  </div>
                </Popover>
              );
            })}
          </div>
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
            Di chuột qua từng ngày để xem công việc — bấm vào ngày để ghim lại.
          </div>
        </div>

        {/* BÊN PHẢI: công việc của ngày đang trỏ tới */}
        <div style={{ flex: '1 1 320px', minWidth: 280, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
          <h4 style={{ marginBottom: 12 }}>
            Công việc ngày {fmtDate(active.y, active.m, active.d)}
            <Tag style={{ marginLeft: 8 }}>{activeTasks.length} việc</Tag>
          </h4>
          {activeTasks.length === 0 ? (
            <Empty description="Ngày này chưa có công việc nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={activeTasks}
              renderItem={(t) => (
                <List.Item key={t.id}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag color={priorityColor(t.priority)}>{t.priority || '—'}</Tag>
                      <Tag color={statusColor(t.status)}>{t.status || '—'}</Tag>
                      <span style={{ color: '#888', fontSize: 12 }}>Hạn: {fmtTime(t.deadline)}</span>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DataSections;
