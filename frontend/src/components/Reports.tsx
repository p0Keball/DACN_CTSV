import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, DatePicker, Table, Button, Input, message, Row, Col, Progress, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaskReport, getSemesters, getParticipation, getParticipationByClass } from '../services/api';
import { exportToExcel } from '../utils/exportExcel';

const { RangePicker } = DatePicker;

interface TaskRow {
  period: string;
  total: string;
  completed: string;
  overdue: string;
  processing: string;
}

interface ClassRow {
  ClassCode: string;
  ClassName: string;
  TeacherName: string | null;
  total_students: string;
  assigned: string;
  participated: string;
  absent: string;
}

interface StudentRow {
  StudentID: string;
  FirstName: string;
  LastName: string;
  ClassStudentID: string;
  assigned: string;
  participated: string;
  absent: string;
}

const GROUP_OPTIONS = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'week', label: 'Theo tuần' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'quarter', label: 'Theo quý' },
  { value: 'year', label: 'Theo năm' },
];

// period backend trả về dạng YYYY-MM-DD (đầu bucket) → hiển thị gọn theo kỳ
const formatPeriod = (period: string, group: string) => {
  const d = dayjs(period);
  if (!d.isValid()) return period;
  if (group === 'month') return d.format('MM/YYYY');
  if (group === 'quarter') return `Q${Math.floor(d.month() / 3) + 1}/${d.year()}`;
  if (group === 'year') return d.format('YYYY');
  return d.format('DD/MM/YYYY');
};

const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
const rate = (done: string | number, total: string | number) => {
  const t = num(total);
  if (t === 0) return 0;
  return Math.round((num(done) / t) * 100);
};

const summaryCardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 150,
  background: '#fafafa',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #f0f0f0',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

// Báo cáo tổng hợp: công việc theo kỳ + rèn luyện gom theo lớp.
// View chính theo lớp; bấm mở rộng 1 lớp để xem SV trong lớp đó (phương án 2).
const Reports: React.FC = () => {
  const [group, setGroup] = useState('month');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(6, 'month'), dayjs()]);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);

  const [semesters, setSemesters] = useState<string[]>([]);
  const [semester, setSemester] = useState<string>('');
  const [classRows, setClassRows] = useState<ClassRow[]>([]);
  const [classLoading, setClassLoading] = useState(true);
  const [classSearch, setClassSearch] = useState('');
  const [classKeyword, setClassKeyword] = useState('');
  // Cache chi tiết SV theo lớp (lazy khi mở rộng, key = ClassCode)
  const [expandedData, setExpandedData] = useState<Record<string, StudentRow[]>>({});
  const [expanding, setExpanding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = window.setTimeout(() => setClassKeyword(classSearch.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [classSearch]);

  useEffect(() => {
    getSemesters()
      .then(res => {
        if (res.success && res.data.length > 0) {
          setSemesters(res.data);
          setSemester(res.data[0]);
        }
      })
      .catch(() => undefined);
  }, []);

  // Đổi kỳ/khoảng thời gian → tự tải lại (không cần nút Xem)
  // Bật loading ở handler đổi filter (dưới), effect chỉ fetch + tắt loading trong callback.
  useEffect(() => {
    getTaskReport({
      group,
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
    })
      .then(res => { if (res.success) setTaskRows(res.data); })
      .catch(() => { message.error('Không tải được báo cáo công việc'); })
      .finally(() => { setTaskLoading(false); });
  }, [group, range]);

  useEffect(() => {
    getParticipationByClass(semester || undefined)
      .then(res => { if (res.success) setClassRows(res.data); })
      .catch(() => { message.error('Không tải được thống kê theo lớp'); })
      .finally(() => { setClassLoading(false); });
  }, [semester]);

  const handleGroupChange = (v: string) => { setTaskLoading(true); setGroup(v); };
  const handleRangeChange = (v: [dayjs.Dayjs, dayjs.Dayjs] | null) => { setTaskLoading(true); setRange(v); };
  const handleSemesterChange = (v: string) => { setClassLoading(true); setExpandedData({}); setSemester(v); };

  // Tóm tắt công việc từ các kỳ đang hiển thị
  const taskSummary = useMemo(() => {
    const total = taskRows.reduce((s, r) => s + num(r.total), 0);
    const completed = taskRows.reduce((s, r) => s + num(r.completed), 0);
    const overdue = taskRows.reduce((s, r) => s + num(r.overdue), 0);
    const processing = taskRows.reduce((s, r) => s + num(r.processing), 0);
    return { total, completed, overdue, processing, doneRate: rate(completed, total) };
  }, [taskRows]);

  const filteredClasses = classRows.filter(r => {
    if (!classKeyword) return true;
    return (r.ClassCode || '').toLowerCase().includes(classKeyword) ||
      (r.ClassName || '').toLowerCase().includes(classKeyword) ||
      (r.TeacherName || '').toLowerCase().includes(classKeyword);
  });

  const handleExpand = async (expanded: boolean, record: ClassRow) => {
    if (!expanded || expandedData[record.ClassCode]) return;
    setExpanding(prev => ({ ...prev, [record.ClassCode]: true }));
    try {
      const res = await getParticipation(semester || undefined, record.ClassCode);
      if (res.success) setExpandedData(prev => ({ ...prev, [record.ClassCode]: res.data }));
    } catch {
      message.error(`Không tải được danh sách SV lớp ${record.ClassCode}`);
    } finally {
      setExpanding(prev => ({ ...prev, [record.ClassCode]: false }));
    }
  };

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="Báo cáo công việc theo kỳ" style={{ borderRadius: '12px' }}>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col>
            <Select style={{ width: 140 }} value={group} onChange={handleGroupChange} options={GROUP_OPTIONS} />
          </Col>
          <Col>
            <RangePicker value={range} onChange={(v) => handleRangeChange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
          </Col>
          <Col>
            <Button
              icon={<DownloadOutlined />}
              disabled={taskRows.length === 0}
              onClick={() => exportToExcel(
                taskRows.map(r => ({ period: formatPeriod(r.period, group), total: r.total, completed: r.completed, overdue: r.overdue, processing: r.processing })),
                { period: 'Kỳ', total: 'Tổng', completed: 'Hoàn thành', overdue: 'Quá hạn', processing: 'Đang xử lý' },
                `bao-cao-cong-viec-${group}`
              )}
            >
              Xuất Excel
            </Button>
          </Col>
        </Row>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Tổng công việc</span>
            <span style={{ fontSize: '24px', fontWeight: 600 }}>{taskSummary.total}</span>
          </div>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Hoàn thành ({taskSummary.doneRate}%)</span>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#52c41a' }}>{taskSummary.completed}</span>
          </div>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Quá hạn</span>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#f5222d' }}>{taskSummary.overdue}</span>
          </div>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Đang xử lý</span>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#1890ff' }}>{taskSummary.processing}</span>
          </div>
        </div>
        <Table
          size="small"
          rowKey="period"
          loading={taskLoading}
          pagination={false}
          columns={[
            { title: 'Kỳ', dataIndex: 'period', render: (v: string) => formatPeriod(v, group) },
            { title: 'Tổng', dataIndex: 'total' },
            { title: 'Hoàn thành', dataIndex: 'completed' },
            { title: 'Quá hạn', dataIndex: 'overdue' },
            { title: 'Đang xử lý', dataIndex: 'processing' },
          ]}
          dataSource={taskRows}
          locale={{ emptyText: 'Không có công việc trong khoảng thời gian này' }}
        />
      </Card>

      <Card title="Thống kê rèn luyện theo lớp" style={{ borderRadius: '12px' }}>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              style={{ width: 200 }}
              placeholder="Chọn học kỳ"
              value={semester || undefined}
              onChange={handleSemesterChange}
              options={semesters.map(s => ({ value: s, label: s }))}
            />
          </Col>
          <Col flex={1}>
            <Input
              placeholder="Tìm theo mã / tên lớp / GVCN..."
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Button
              icon={<DownloadOutlined />}
              disabled={filteredClasses.length === 0}
              onClick={() => exportToExcel(
                filteredClasses.map(r => ({
                  ClassCode: r.ClassCode, ClassName: r.ClassName, TeacherName: r.TeacherName || '',
                  total_students: r.total_students, assigned: r.assigned,
                  participated: r.participated, absent: r.absent,
                  rate: `${rate(r.participated, r.assigned)}%`,
                })),
                { ClassCode: 'Mã lớp', ClassName: 'Tên lớp', TeacherName: 'GVCN', total_students: 'Sĩ số', assigned: 'Lượt phân công', participated: 'Lượt tham gia', absent: 'Vắng', rate: 'Tỉ lệ tham gia' },
                `ren-luyen-theo-lop-${semester || 'all'}`
              )}
            >
              Xuất Excel
            </Button>
          </Col>
        </Row>
        <Table
          size="small"
          rowKey="ClassCode"
          loading={classLoading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          onExpand={handleExpand}
          expandable={{
            expandedRowRender: (r: ClassRow) => {
              if (expanding[r.ClassCode]) return <Spin size="small" />;
              const students = expandedData[r.ClassCode] || [];
              return (
                <Table
                  size="small"
                  rowKey="StudentID"
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  columns={[
                    { title: 'MSSV', dataIndex: 'StudentID', width: 110 },
                    { title: 'Họ tên', render: (_: unknown, s: StudentRow) => `${s.FirstName} ${s.LastName}` },
                    { title: 'Phân công', dataIndex: 'assigned', width: 100 },
                    { title: 'Tham gia', dataIndex: 'participated', width: 90 },
                    { title: 'Vắng', dataIndex: 'absent', width: 70 },
                  ]}
                  dataSource={students}
                  locale={{ emptyText: 'Lớp chưa có SV được phân công trong học kỳ này' }}
                />
              );
            },
          }}
          columns={[
            { title: 'Lớp', dataIndex: 'ClassCode', width: 100, sorter: (a: ClassRow, b: ClassRow) => a.ClassCode.localeCompare(b.ClassCode) },
            { title: 'Tên lớp', dataIndex: 'ClassName', ellipsis: true },
            { title: 'GVCN', dataIndex: 'TeacherName', ellipsis: true, render: (v: string | null) => v || '—' },
            { title: 'Sĩ số', dataIndex: 'total_students', width: 80, sorter: (a: ClassRow, b: ClassRow) => num(a.total_students) - num(b.total_students) },
            { title: 'Lượt phân công', dataIndex: 'assigned', width: 130, sorter: (a: ClassRow, b: ClassRow) => num(a.assigned) - num(b.assigned) },
            { title: 'Lượt tham gia', dataIndex: 'participated', width: 120, sorter: (a: ClassRow, b: ClassRow) => num(a.participated) - num(b.participated) },
            { title: 'Vắng', dataIndex: 'absent', width: 70 },
            {
              title: 'Tỉ lệ tham gia', width: 170,
              sorter: (a: ClassRow, b: ClassRow) => rate(a.participated, a.assigned) - rate(b.participated, b.assigned),
              defaultSortOrder: 'ascend' as const,
              render: (_: unknown, r: ClassRow) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Progress percent={rate(r.participated, r.assigned)} size="small" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, minWidth: 36 }}>{rate(r.participated, r.assigned)}%</span>
                </span>
              ),
            },
          ]}
          dataSource={filteredClasses}
          locale={{ emptyText: 'Chưa có dữ liệu — điểm danh ở tab Phân công trong chi tiết công việc' }}
        />
      </Card>
    </div>
  );
};

export default Reports;
