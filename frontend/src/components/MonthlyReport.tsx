import React, { useMemo } from 'react';

interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  [key: string]: unknown;
}

interface MonthlyReportProps {
  tasks?: Task[];
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ tasks = [] }) => {
  // Tự động tính toán số liệu thống kê cho tháng hiện tại
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Lọc ra các công việc có deadline rơi vào tháng này
    const tasksThisMonth = tasks.filter(task => {
      if (!task.deadline) return false;
      const d = new Date(task.deadline);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      total: tasksThisMonth.length,
      completed: tasksThisMonth.filter(t => t.status === 'Hoàn thành').length,
      processing: tasksThisMonth.filter(t => t.status === 'Đang xử lý').length,
      overdue: tasksThisMonth.filter(t => {
        if (t.status === 'Hoàn thành' || !t.deadline) return false;
        return new Date(t.deadline) < now;
      }).length
    };
  }, [tasks]);

  const cardStyle = {
    flex: 1,
    background: '#fafafa',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  };

  return (
    <div style={{ marginTop: '24px', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '20px' }}>Báo cáo nhanh / Thống kê tháng này</h3>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
        
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Tổng công việc</span>
          <h2 style={{ margin: 0, fontSize: '24px' }}>{stats.total}</h2>
        </div>
        
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Hoàn thành</span>
          <h2 style={{ margin: 0, fontSize: '24px' }}>{stats.completed}</h2>
        </div>
        
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Đang xử lý</span>
          <h2 style={{ margin: 0, fontSize: '24px' }}>{stats.processing}</h2>
        </div>
        
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Quá hạn</span>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#f5222d' }}>{stats.overdue}</h2>
        </div>

        {/* 2 Ô này chờ tích hợp API Sinh viên / DLU Proxy */}
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Hồ sơ cần xử lý</span>
          <h2 style={{ margin: 0, fontSize: '24px' }}>0</h2>
          <span style={{ color: '#faad14', fontSize: '12px' }}>Chờ API Sinh viên</span>
        </div>
        
        <div style={cardStyle}>
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>Hồ sơ hoàn tất</span>
          <h2 style={{ margin: 0, fontSize: '24px' }}>0</h2>
          <span style={{ color: '#faad14', fontSize: '12px' }}>Chờ API Sinh viên</span>
        </div>

      </div>
    </div>
  );
};

export default MonthlyReport;