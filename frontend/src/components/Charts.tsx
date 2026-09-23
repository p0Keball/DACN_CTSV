import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  [key: string]: unknown;
}

interface MonthCount {
  name: string;
  'Hoàn thành': number;
  'Đang xử lý': number;
  'Mới': number;
}

interface ChartsProps {
  tasks?: Task[];
}

const Charts: React.FC<ChartsProps> = ({ tasks = [] }) => {
  const pieChartData = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const statusCounts = tasks.reduce((acc: Record<string, number>, task) => {
      const status = task.status || 'Chưa xác định';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(statusCounts).map(key => ({
      name: key,
      value: statusCounts[key],
    }));
  }, [tasks]);

  const barChartData = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const monthCounts = tasks.reduce((acc: Record<string, MonthCount>, task) => {
      if (!task.deadline) return acc;
      const date = new Date(task.deadline);
      const monthYear = `T${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { name: monthYear, 'Hoàn thành': 0, 'Đang xử lý': 0, 'Mới': 0 };
      }
      if (task.status === 'Hoàn thành') acc[monthYear]['Hoàn thành'] += 1;
      else if (task.status === 'Đang xử lý') acc[monthYear]['Đang xử lý'] += 1;
      else acc[monthYear]['Mới'] += 1;
      return acc;
    }, {});
    return Object.values(monthCounts);
  }, [tasks]);

  return (
    <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
      <div style={{ flex: 2, background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '20px' }}>Tiến độ công việc theo thời gian</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Hoàn thành" stackId="a" fill="#52c41a" />
            <Bar dataKey="Đang xử lý" stackId="a" fill="#1890ff" />
            <Bar dataKey="Mới" stackId="a" fill="#faad14" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Cơ cấu trạng thái</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
              {pieChartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={['#1890ff', '#52c41a', '#faad14', '#f5222d'][index % 4]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;