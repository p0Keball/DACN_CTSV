import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import TasksWorkspace from './pages/TasksWorkspace';
import TaskCompose from './pages/TaskCompose';
import ReportsPage from './pages/ReportsPage';
import RecordsPage from './pages/RecordsPage';

const { Content } = Layout;

// Mục Công việc dùng full-width (tối đa ~1600px): vừa cho bảng danh sách,
// vừa cho trang Soạn 2 cột thấy tổng thể; các trang còn lại giữ 1200px.
const isWidePath = (pathname: string) =>
  pathname === '/cong-viec' ||
  pathname === '/cong-viec/moi' ||
  pathname === '/bao-cao' ||
  pathname === '/ho-so' ||
  /\/cong-viec\/\d+\/sua$/.test(pathname);

const PageContent: React.FC = () => {
  const location = useLocation();
  const wide = isWidePath(location.pathname);
  // Workspace Công việc mount thường trực (Gói 2d): sang mục khác chỉ ẩn CSS,
  // tab soạn + nháp không mất. Route /cong-viec chỉ giữ chỗ.
  const onTasks = location.pathname === '/cong-viec';
  return (
    <Content style={{
      padding: '24px',
      background: '#f4f7fb',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: wide ? '1600px' : '1200px' }}>
        <div style={{ display: onTasks ? 'block' : 'none' }}>
          <TasksWorkspace active={onTasks} />
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sinh-vien" element={<Students />} />
          <Route path="/cong-viec" element={<></>} />
          <Route path="/cong-viec/moi" element={<TaskCompose />} />
          <Route path="/cong-viec/:id/sua" element={<TaskCompose />} />
          <Route path="/bao-cao" element={<ReportsPage />} />
          <Route path="/ho-so" element={<RecordsPage />} />
        </Routes>
      </div>
    </Content>
  );
};

const App: React.FC = () => {
  return (
    // Ghi đè tông màu chủ đạo thành Xanh lá (giống E-Office DLU)
    <ConfigProvider theme={{ token: { colorPrimary: '#237804', colorInfo: '#237804' } }}>
      <Router>
        {/* Layout tổng không còn Sidebar nên không cần Layout lồng nhau hay marginLeft */}
        <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>

          {/* Header đã được cấu hình position: sticky bên trong component */}
          <Header />

          <PageContent />
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;