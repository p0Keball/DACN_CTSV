import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  ApartmentOutlined,
  UserOutlined,
  FolderOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

// Đổi key thành các đường dẫn tương ứng để làm Router
const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/cong-viec', icon: <UnorderedListOutlined />, label: 'Công việc' },
  { key: '/quy-trinh', icon: <ApartmentOutlined />, label: 'Quy trình' },
  { key: '/sinh-vien', icon: <UserOutlined />, label: 'Sinh viên' },
  { key: '/ho-so', icon: <FolderOutlined />, label: 'Hồ sơ' },
  { key: '/bao-cao', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: '/thong-bao', icon: <BellOutlined />, label: 'Thông báo' },
  { key: '/cai-dat', icon: <SettingOutlined />, label: 'Cài đặt' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sider
      theme="light"
      width={230}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        borderRight: '1px solid #f0f0f0',
        zIndex: 100,
      }}
    >
      {/* Khu vực Logo và Tên ứng dụng */}
      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          backgroundColor: '#237804', // Đổi sang xanh lá E-Office
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ReadOutlined style={{ fontSize: '22px', color: '#ffffff' }} />
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1f1f1f', lineHeight: '1.3' }}>
          TRỢ LÝ<br />CÔNG TÁC SINH VIÊN
        </div>
      </div>

      {/* Thanh Menu điều hướng */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]} // Tự động highlight menu theo URL hiện tại
        onClick={(e) => navigate(e.key)} // Chuyển trang khi người dùng bấm vào
        items={menuItems}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;