import React from 'react';
import { Layout, Input, Select, Badge, Avatar, Space, Typography } from 'antd';
import { SearchOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

const Header: React.FC = () => {
  return (
    <AntHeader
      style={{
        background: '#ffffff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      {/* Tiêu đề trang */}
      <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>
        TỔNG QUAN DASHBOARD
      </Title>

      {/* Thanh công cụ bên phải */}
      <Space size="large" align="center">
        {/* Ô tìm kiếm */}
        <Input
          placeholder="Tìm kiếm công việc, sinh viên..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ width: 220, borderRadius: '6px' }}
        />

        {/* Bộ lọc Học kỳ */}
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: '13px' }}>Học kỳ</Text>
          <Select defaultValue="hk2" style={{ width: 100 }}>
            <Select.Option value="hk1">Học kỳ 1</Select.Option>
            <Select.Option value="hk2">Học kỳ 2</Select.Option>
          </Select>
        </Space>

        {/* Bộ lọc Năm học */}
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: '13px' }}>Năm học</Text>
          <Select defaultValue="2025-2026" style={{ width: 120 }}>
            <Select.Option value="2024-2025">2024-2025</Select.Option>
            <Select.Option value="2025-2026">2025-2026</Select.Option>
          </Select>
        </Space>

        {/* Chuông thông báo */}
        <Badge count={3} color="#1677ff">
          <BellOutlined style={{ fontSize: '20px', cursor: 'pointer', color: '#595959' }} />
        </Badge>

        {/* Avatar và Thông tin người dùng */}
        <Space size="middle" style={{ cursor: 'pointer', marginLeft: '8px' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <Text style={{ fontSize: '14px', fontWeight: 600 }}>Nguyễn Văn A</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>Trợ lý CTSV</Text>
          </div>
        </Space>
      </Space>
    </AntHeader>
  );
};

export default Header;