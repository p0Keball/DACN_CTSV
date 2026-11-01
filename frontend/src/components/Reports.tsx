import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, DatePicker, Table, Button, message, Row, Col } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaskReport } from '../services/api';
import { exportToExcel } from '../utils/exportExcel';

const { RangePicker } = DatePicker;

interface TaskRow {
  period: string;
  total: string;
  completed: string;
  processing: string;
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

// Báo cáo công việc theo kỳ (đã ẩn phần hiệu suất / điểm rèn luyện).
const Reports: React.FC = () => {
  const [group, setGroup] = useState('month');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(6, 'month'), dayjs()]);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);

  // Đổi kỳ/khoảng thời gian chung → tự tải lại (không cần nút Xem)
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

  const handleGroupChange = (v: string) => { setTaskLoading(true); setGroup(v); };
  const handleRangeChange = (v: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setTaskLoading(true);
    setRange(v);
  };

  // Tóm tắt công việc từ các kỳ đang hiển thị
  const taskSummary = useMemo(() => {
    const total = taskRows.reduce((s, r) => s + num(r.total), 0);
    const completed = taskRows.reduce((s, r) => s + num(r.completed), 0);
    const processing = taskRows.reduce((s, r) => s + num(r.processing), 0);
    return { total, completed, processing, doneRate: rate(completed, total) };
  }, [taskRows]);

  const rangeLabel = range
    ? `${range[0].format('DD/MM/YYYY')} – ${range[1].format('DD/MM/YYYY')}`
    : 'toàn bộ thời gian';

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Bộ lọc thời gian chung cho cả tab */}
      <Card style={{ borderRadius: '12px', background: '#f8f9fa' }} bodyStyle={{ padding: '16px' }}>
        <Row gutter={12} align="middle">
          <Col>
            <Select style={{ width: 140 }} value={group} onChange={handleGroupChange} options={GROUP_OPTIONS} />
          </Col>
          <Col>
            <RangePicker value={range} onChange={(v) => handleRangeChange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" allowClear={false} />
          </Col>
          <Col>
            <span style={{ color: '#8c8c8c', fontSize: 13 }}>Áp dụng cho báo cáo công việc theo kỳ</span>
          </Col>
        </Row>
      </Card>

      <Card
        title={`Báo cáo công việc theo kỳ (${rangeLabel})`}
        style={{ borderRadius: '12px' }}
        extra={
          <Button
            icon={<DownloadOutlined />}
            disabled={taskRows.length === 0}
            onClick={() => exportToExcel(
              taskRows.map(r => ({ period: formatPeriod(r.period, group), total: r.total, completed: r.completed, processing: r.processing })),
              { period: 'Kỳ', total: 'Tổng', completed: 'Kết thúc', processing: 'Đã gửi' },
              `bao-cao-cong-viec-${group}`
            )}
          >
            Xuất Excel
          </Button>
        }
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Tổng công việc</span>
            <span style={{ fontSize: '24px', fontWeight: 600 }}>{taskSummary.total}</span>
          </div>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Kết thúc ({taskSummary.doneRate}%)</span>
            <span style={{ fontSize: '24px', fontWeight: 600, color: '#52c41a' }}>{taskSummary.completed}</span>
          </div>
          <div style={summaryCardStyle}>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Đã gửi</span>
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
            { title: 'Kết thúc', dataIndex: 'completed' },
            { title: 'Đã gửi', dataIndex: 'processing' },
          ]}
          dataSource={taskRows}
          locale={{ emptyText: 'Không có công việc trong khoảng thời gian này' }}
        />
      </Card>
    </div>
  );
};

export default Reports;
