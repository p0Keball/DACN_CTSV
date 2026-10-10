import React from 'react';
import { Layout, Menu, Avatar, Space, Typography, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  FolderOutlined,
  BarChartOutlined,
  ReadOutlined,
  SettingOutlined,
  UserSwitchOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/api';
import NotificationBell from './NotificationBell';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

// Định nghĩa menu (Quy trình / Thông báo chưa có trang — ẩn tạm để khỏi bấm vào trắng)
const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/cong-viec', icon: <UnorderedListOutlined />, label: 'Công việc' },
  // { key: '/quy-trinh', icon: <ApartmentOutlined />, label: 'Quy trình' },
  { key: '/sinh-vien', icon: <UserOutlined />, label: 'Quản lý đào tạo' },
  { key: '/ho-so', icon: <FolderOutlined />, label: 'Hồ sơ' },
  { key: '/bao-cao', icon: <BarChartOutlined />, label: 'Báo cáo' },
  // { key: '/thong-bao', icon: <BellOutlined />, label: 'Thông báo' },
];

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Route soạn (/cong-viec/moi, /:id/sua) vẫn highlight mục Công việc
  const selectedKey = location.pathname.startsWith('/cong-viec') ? '/cong-viec' : location.pathname;
  const username = localStorage.getItem('ctsv_user') || 'Trợ lý CTSV';

  const doLogout = () => { logout(); navigate('/dang-nhap'); };

  // Menu tài khoản: đăng xuất / chuyển đổi tài khoản / cài đặt (chờ cấu hình sau).
  const accountMenu = {
    onClick: ({ key }: { key: string }) => {
      if (key === 'settings') message.info('Trang Cài đặt đang được phát triển');
      else if (key === 'switch') { doLogout(); message.info('Đã đăng xuất — đăng nhập tài khoản khác'); }
      else if (key === 'logout') doLogout();
    },
    items: [
      { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
      { key: 'switch', icon: <UserSwitchOutlined />, label: 'Chuyển đổi tài khoản' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
    ],
  };

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
          selectedKeys={[selectedKey]}
          onClick={(e) => navigate(e.key)}
          items={menuItems}
          style={{ borderBottom: 'none', flex: 1, minWidth: 0, lineHeight: '62px' }}
        />
      </div>

      {/* Vùng bên phải: chuông thông báo + tài khoản (ẩn khi chưa đăng nhập) */}
      {localStorage.getItem('ctsv_token') && (
      <Space size="large" align="center" style={{ marginLeft: '16px' }}>
        <NotificationBell />
        <Dropdown menu={accountMenu} trigger={['click']} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#237804' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <Text strong>{username}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>Quản trị viên</Text>
            </div>
            <DownOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
          </Space>
        </Dropdown>
      </Space>
      )}
    </AntHeader>
  );
};

export default Header;
