import React from 'react';
import { Row, Col, Card, Table, Tag, Checkbox, Space, Typography, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { recentTasksData, upcomingTasksData, studentAttentionData } from '../mockData';

const { Title, Text } = Typography;

// Cấu hình các cột cho Bảng "Công việc gần đây"
const recentTasksColumns = [
  {
    title: 'Tên công việc',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => <Text style={{ fontWeight: 500 }}>{text}</Text>,
  },
  {
    title: 'Hạn xử lý',
    dataIndex: 'deadline',
    key: 'deadline',
  },
  {
    title: 'Độ ưu tiên',
    dataIndex: 'priority',
    key: 'priority',
    render: (priority: string) => (
      <Tag color={priority === 'Cao' ? 'red' : 'orange'}>{priority}</Tag>
    ),
  },
  {
    title: 'Người xử lý',
    dataIndex: 'assignee',
    key: 'assignee',
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'Đang xử lý' ? 'processing' : 'warning'}>{status}</Tag>
    ),
  },
];

// Cấu hình các cột cho Bảng "Sinh viên / Hồ sơ cần chú ý"
const studentAttentionColumns = [
  {
    title: 'Họ và tên',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => <Text style={{ fontWeight: 500 }}>{text}</Text>,
  },
  {
    title: 'MSSV',
    dataIndex: 'mssv',
    key: 'mssv',
  },
  {
    title: 'Lớp',
    dataIndex: 'class',
    key: 'class',
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => <Tag color="error">{status}</Tag>,
  },
];

const DataSections: React.FC = () => {
  return (
    <div style={{ marginTop: '16px' }}>
      <Row gutter={[16, 16]}>
        {/* Bảng "Công việc gần đây" */}
        <Col xs={24} lg={15}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Công việc gần đây</Title>}
            extra={<Button type="link" style={{ padding: 0 }}>Xem tất cả <RightOutlined /></Button>}
            bordered={false}
            style={{ borderRadius: '8px' }}
          >
            <Table
              columns={recentTasksColumns}
              dataSource={recentTasksData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Danh sách Checkbox "Công việc sắp đến hạn" */}
        <Col xs={24} lg={9}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Công việc sắp đến hạn</Title>}
            extra={<Button type="link" style={{ padding: 0 }}>Xem tất cả <RightOutlined /></Button>}
            bordered={false}
            style={{ borderRadius: '8px', height: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {upcomingTasksData.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox><Text style={{ fontSize: '13px' }}>{item.title}</Text></Checkbox>
                  <Tag color="red" style={{ borderRadius: '10px' }}>{item.deadline}</Tag>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Bảng "Danh sách sinh viên / hồ sơ cần chú ý" */}
      <Row style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>Danh sách sinh viên / hồ sơ cần chú ý</Title>}
            extra={<Button type="link" style={{ padding: 0 }}>Xem tất cả <RightOutlined /></Button>}
            bordered={false}
            style={{ borderRadius: '8px' }}
          >
            <Table
              columns={studentAttentionColumns}
              dataSource={studentAttentionData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DataSections;