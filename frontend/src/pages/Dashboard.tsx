import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import StatisticCard from '../components/StatisticCard';
import Charts from '../components/Charts';
import DataSections from '../components/DataSections';
import MonthlyReport from '../components/MonthlyReport';
import { getTasks, getTaskStats } from '../services/api';

export interface Task {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  [key: string]: unknown;
}

export interface TaskStats {
  processing?: number;
  pending?: number;
  overdue?: number;
  completed?: number;
}

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([getTasks(), getTaskStats()])
      .then(([tasksRes, statsRes]) => {
        if (tasksRes.success) setTasks(tasksRes.data);
        if (statsRes.success) setStats(statsRes.data);
      })
      .catch((err: Error) => console.error("Lỗi kết nối Backend:", err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Đang kết nối dữ liệu PostgreSQL..." />
      </div>
    );
  }

  return (
    <>
      <StatisticCard stats={stats} />
      <Charts tasks={tasks} />
      <DataSections tasks={tasks} />
      <MonthlyReport tasks={tasks} />
    </>
  );
};

export default Dashboard;