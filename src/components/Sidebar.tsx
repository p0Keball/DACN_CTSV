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

const { Sider } = Layout;

// Danh sách các mục menu bên thanh Sidebar
const menuItems = [
  { key: '1', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '2', icon: <UnorderedListOutlined />, label: 'Công việc' },
  { key: '3', icon: <ApartmentOutlined />, label: 'Quy trình' },
  { key: '4', icon: <UserOutlined />, label: 'Sinh viên' },
  { key: '5', icon: <FolderOutlined />, label: 'Hồ sơ' },
  { key: '6', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: '7', icon: <BellOutlined />, label: 'Thông báo' },
  { key: '8', icon: <SettingOutlined />, label: 'Cài đặt' },
];

const Sidebar: React.FC = () => {
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
          backgroundColor: '#1677ff',
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
        defaultSelectedKeys={['1']}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;