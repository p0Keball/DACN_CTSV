import React from 'react';
import { Layout, Input, Select, Badge, Avatar, Space, Typography } from 'antd';
import { SearchOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Phân tích tham số từ URL hiện tại
  const searchParams = new URLSearchParams(location.search);
  const currentSearch = searchParams.get('search') || '';
  const currentHk = searchParams.get('hk') || undefined;
  const currentYear = searchParams.get('year') || undefined;

  // 2. Hàm xử lý khi người dùng thay đổi bộ lọc
  const handleFilterChange = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key); // Xóa param nếu người dùng xóa trống
    }
    // Điều hướng sang URL mới chứa tham số lọc
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

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
      }}
    >
      {/* Cột trái: Tiêu đề */}
      <Title level={4} style={{ margin: 0, textTransform: 'uppercase' }}>
        Tổng quan Dashboard
      </Title>

      {/* Cột giữa: Bộ lọc Tìm kiếm, Học kỳ, Năm học */}
      <Space size="large">
        <Input
          placeholder="Tìm kiếm công việc..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          defaultValue={currentSearch}
          allowClear
          onPressEnter={(e) => handleFilterChange('search', (e.target as HTMLInputElement).value)}
          style={{ width: 300 }}
        />
        
        <Space>
          <Text type="secondary">Học kỳ</Text>
          <Select
            placeholder="Chọn HK"
            value={currentHk}
            allowClear
            onChange={(value) => handleFilterChange('hk', value)}
            options={[
              { value: 'HK1', label: 'Học kỳ 1' },
              { value: 'HK2', label: 'Học kỳ 2' },
              { value: 'HK3', label: 'Học kỳ 3' }
            ]}
            style={{ width: 110 }}
          />
        </Space>

        <Space>
          <Text type="secondary">Năm học</Text>
          <Select
            placeholder="Năm học"
            value={currentYear}
            allowClear
            onChange={(value) => handleFilterChange('year', value)}
            options={[
              { value: '2024-2025', label: '2024-2025' },
              { value: '2025-2026', label: '2025-2026' },
              { value: '2026-2027', label: '2026-2027' }
            ]}
            style={{ width: 130 }}
          />
        </Space>
      </Space>

      {/* Cột phải: Thông báo & Tài khoản người dùng */}
      <Space size="large" align="center">
        <Badge count={3}>
          <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
        </Badge>
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <Text strong>Nguyễn Văn A</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>Trợ lý CTSV</Text>
          </div>
        </Space>
      </Space>
    </AntHeader>
  );
};

export default Header;