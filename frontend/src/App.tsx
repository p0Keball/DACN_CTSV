import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
// Đã xóa import Sidebar
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Tasks from './pages/Tasks';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    // Ghi đè tông màu chủ đạo thành Xanh lá (giống E-Office DLU)
    <ConfigProvider theme={{ token: { colorPrimary: '#237804', colorInfo: '#237804' } }}>
      <Router>
        {/* Layout tổng không còn Sidebar nên không cần Layout lồng nhau hay marginLeft */}
        <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
          
          {/* Header đã được cấu hình position: sticky bên trong component */}
          <Header />
          
          {/* Content được dùng Flexbox để luôn căn giữa màn hình */}
          <Content style={{ 
            padding: '24px', 
            background: '#f4f7fb',
            display: 'flex', 
            justifyContent: 'center' 
          }}>
            
            {/* Box chứa nội dung chính giới hạn chiều rộng max-width */}
            <div style={{ width: '100%', maxWidth: '1200px' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sinh-vien" element={<Students />} />
                <Route path="/cong-viec" element={<Tasks />} />
              </Routes>
            </div>

          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;