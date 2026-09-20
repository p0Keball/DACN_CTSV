import React from 'react';

interface TaskStats {
  processing?: number;
  pending?: number;
  overdue?: number;
  completed?: number;
}

interface StatisticCardProps {
  stats?: TaskStats | null;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ stats }) => {
  const cardStyle = {
    flex: 1,
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  };

  return (
    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
      <div style={cardStyle}>
        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>Công việc đang xử lý</span>
        <h2 style={{ margin: 0, fontSize: '28px', color: '#1890ff' }}>{stats?.processing ?? 0}</h2>
      </div>
      <div style={cardStyle}>
        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>Công việc đến hạn</span>
        <h2 style={{ margin: 0, fontSize: '28px', color: '#faad14' }}>{stats?.pending ?? 0}</h2>
      </div>
      <div style={cardStyle}>
        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>Quá hạn</span>
        <h2 style={{ margin: 0, fontSize: '28px', color: '#f5222d' }}>{stats?.overdue ?? 0}</h2>
      </div>
      <div style={cardStyle}>
        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>Hoàn thành</span>
        <h2 style={{ margin: 0, fontSize: '28px', color: '#52c41a' }}>{stats?.completed ?? 0}</h2>
      </div>
    </div>
  );
};

export default StatisticCard;