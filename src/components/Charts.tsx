import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { weeklyProgressData, taskStatusData } from '../mockData';

const { Title } = Typography;

const Charts: React.FC = () => {
  return (
    <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
      {/* Biểu đồ cột chồng - Tiến độ công việc theo tuần */}
      <Col xs={24} lg={15}>
        <Card
          title={<Title level={5} style={{ margin: 0 }}>Tiến độ công việc theo tuần</Title>}
          bordered={false}
          style={{ borderRadius: '8px', height: '100%' }}
        >
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} />
                <YAxis tickLine={false} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="new" name="Mới" stackId="a" fill="#1677ff" barSize={20} />
                <Bar dataKey="processing" name="Đang xử lý" stackId="a" fill="#faad14" barSize={20} />
                <Bar dataKey="completed" name="Hoàn thành" stackId="a" fill="#52c41a" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>

      {/* Biểu đồ Donut - Cơ cấu trạng thái công việc */}
      <Col xs={24} lg={9}>
        <Card
          title={<Title level={5} style={{ margin: 0 }}>Cơ cấu trạng thái công việc</Title>}
          bordered={false}
          style={{ borderRadius: '8px', height: '100%' }}
        >
          <div style={{ width: '100%', height: 300, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="40%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>

            {/* Hiển thị con số tổng ở chính giữa hình vành khăn */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '40%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Tổng</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f1f1f' }}>90</div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Charts;