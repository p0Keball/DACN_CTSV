import React from 'react';
import Reports from '../components/Reports';

// Tab Báo cáo (/bao-cao): gom báo cáo công việc theo kỳ + thống kê rèn luyện.
// Tách khỏi Dashboard để Tổng quan giữ đúng vai trò xem nhanh.
const ReportsPage: React.FC = () => {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Báo cáo & Thống kê</h2>
      <Reports />
    </div>
  );
};

export default ReportsPage;
