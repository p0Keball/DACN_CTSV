import React from 'react';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatisticCard from './components/StatisticCard';
import Charts from './components/Charts';
import DataSections from './components/DataSections';
import MonthlyReport from './components/MonthlyReport';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      {/* Sidebar cố định bên trái */}
      <Sidebar />

      {/* Bố cục nội dung chính bên phải */}
      <Layout style={{ marginLeft: 230, background: '#f4f7fb' }}>
        <Header />

        {/* Nội dung Dashboard */}
        <Content style={{ padding: '24px', background: '#f4f7fb' }}>
          <StatisticCard />
          <Charts />
          <DataSections />
          <MonthlyReport />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;