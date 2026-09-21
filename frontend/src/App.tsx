import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Tasks from './pages/Tasks';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    // Ghi đè tông màu chủ đạo thành Xanh lá (giống E-Office DLU)[cite: 13]
    <ConfigProvider theme={{ token: { colorPrimary: '#237804', colorInfo: '#237804' } }}>
      <Router>
        <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
          <Sidebar />
          <Layout style={{ marginLeft: 230, background: '#f4f7fb' }}>
            <Header />
            <Content style={{ padding: '24px', background: '#f4f7fb' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sinh-vien" element={<Students />} />
                <Route path="/cong-viec" element={<Tasks />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;