import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Table, Button, Input, message, Row, Col } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaskReport, getSemesters, getParticipation } from '../services/api';
import { exportToExcel } from '../utils/exportExcel';

const { RangePicker } = DatePicker;

interface TaskRow {
  period: string;
  total: string;
  completed: string;
  overdue: string;
  processing: string;
}

interface ParticipationRow {
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

// Báo cáo tổng hợp (Gói 6): công việc theo kỳ + rèn luyện theo học kỳ.
// Nằm ở Dashboard — góc nhìn tổng hợp cho trợ lý CTSV và lãnh đạo khoa.
const Reports: React.FC = () => {
  const [group, setGroup] = useState('month');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(6, 'month'), dayjs()]);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);

  const [semesters, setSemesters] = useState<string[]>([]);
  const [semester, setSemester] = useState<string>('');
  const [partRows, setPartRows] = useState<ParticipationRow[]>([]);
  const [partLoading, setPartLoading] = useState(true);
  const [partSearch, setPartSearch] = useState('');

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
    getParticipation(semester || undefined)
      .then(res => { if (res.success) setPartRows(res.data); })
      .catch(() => { message.error('Không tải được thống kê rèn luyện'); })
      .finally(() => { setPartLoading(false); });
  }, [semester]);

  const filteredParts = partRows.filter(r => {
    const kw = partSearch.trim().toLowerCase();
    if (!kw) return true;
    return r.StudentID.toLowerCase().includes(kw) ||
      `${r.FirstName} ${r.LastName}`.toLowerCase().includes(kw) ||
      (r.ClassStudentID || '').toLowerCase().includes(kw);
  });

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="Báo cáo công việc theo kỳ" style={{ borderRadius: '12px' }}>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col>
            <Select style={{ width: 140 }} value={group} onChange={setGroup} options={GROUP_OPTIONS} />
          </Col>
          <Col>
            <RangePicker value={range} onChange={(v) => setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
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

      <Card title="Thống kê rèn luyện theo học kỳ" style={{ borderRadius: '12px' }}>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              style={{ width: 200 }}
              placeholder="Chọn học kỳ"
              value={semester || undefined}
              onChange={setSemester}
              options={semesters.map(s => ({ value: s, label: s }))}
            />
          </Col>
          <Col flex={1}>
            <Input
              placeholder="Tìm theo MSSV / tên / lớp..."
              value={partSearch}
              onChange={e => setPartSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Button
              icon={<DownloadOutlined />}
              disabled={filteredParts.length === 0}
              onClick={() => exportToExcel(
                filteredParts.map(r => ({
                  StudentID: r.StudentID, name: `${r.FirstName} ${r.LastName}`,
                  ClassStudentID: r.ClassStudentID, assigned: r.assigned,
                  participated: r.participated, absent: r.absent,
                })),
                { StudentID: 'MSSV', name: 'Họ tên', ClassStudentID: 'Lớp', assigned: 'Được phân công', participated: 'Đã tham gia', absent: 'Vắng' },
                `ren-luyen-${semester || 'all'}`
              )}
            >
              Xuất Excel
            </Button>
          </Col>
        </Row>
        <Table
          size="small"
          rowKey="StudentID"
          loading={partLoading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          columns={[
            { title: 'MSSV', dataIndex: 'StudentID', width: 110 },
            { title: 'Họ tên', render: (_: unknown, r: ParticipationRow) => `${r.FirstName} ${r.LastName}` },
            { title: 'Lớp', dataIndex: 'ClassStudentID', width: 90 },
            { title: 'Được phân công', dataIndex: 'assigned', width: 130 },
            { title: 'Đã tham gia', dataIndex: 'participated', width: 110 },
            { title: 'Vắng', dataIndex: 'absent', width: 80 },
          ]}
          dataSource={filteredParts}
          locale={{ emptyText: 'Chưa có dữ liệu — điểm danh ở tab Phân công trong chi tiết công việc' }}
        />
      </Card>
    </div>
  );
};

export default Reports;
