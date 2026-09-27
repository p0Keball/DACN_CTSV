import React from 'react';
import { Layout, Menu, Badge, Avatar, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  ApartmentOutlined,
  UserOutlined,
  FolderOutlined,
  BarChartOutlined,
  BellOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

// Định nghĩa menu 
const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/cong-viec', icon: <UnorderedListOutlined />, label: 'Công việc' },
  { key: '/quy-trinh', icon: <ApartmentOutlined />, label: 'Quy trình' },
  { key: '/sinh-vien', icon: <UserOutlined />, label: 'Quản lý đào tạo' },
  { key: '/ho-so', icon: <FolderOutlined />, label: 'Hồ sơ' },
  { key: '/bao-cao', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: '/thong-bao', icon: <BellOutlined />, label: 'Thông báo' },
];

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AntHeader
      style={{
        position: 'sticky', // Giữ UI menu không bị kéo theo khi cuộn
        top: 0,
        zIndex: 1000,
        width: '100%',
        background: '#ffffff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: '64px',
      }}
    >
      {/* Vùng bên trái: Logo và Menu */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
        
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '32px', cursor: 'pointer' }}
        >
          <div style={{ backgroundColor: '#237804', borderRadius: '8px', padding: '6px', display: 'flex' }}>
            <ReadOutlined style={{ fontSize: '20px', color: '#ffffff' }} />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1f1f1f', lineHeight: '1.3' }}>
            TRỢ LÝ<br />CTSV
          </div>
        </div>

        {/* Menu ngang */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          onClick={(e) => navigate(e.key)}
          items={menuItems}
          style={{ borderBottom: 'none', flex: 1, minWidth: 0, lineHeight: '62px' }}
        />
      </div>

      {/* Vùng bên phải: Thông báo & Tài khoản */}
      <Space size="large" align="center" style={{ marginLeft: '16px' }}>
        <Badge count={3}>
          <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
        </Badge>
        <Space style={{ cursor: 'pointer' }}>
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