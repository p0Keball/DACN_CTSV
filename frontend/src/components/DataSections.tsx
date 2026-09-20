import React from 'react';
import { Table, Tag } from 'antd';

interface TaskItem {
  id: number;
  title: string;
  deadline: string;
  priority: string;
  status: string;
  [key: string]: unknown;
}

interface DataSectionsProps {
  tasks?: TaskItem[];
}

const DataSections: React.FC<DataSectionsProps> = ({ tasks = [] }) => {
  const columns = [
    { title: 'Tên công việc', dataIndex: 'title', key: 'title' },
    { 
      title: 'Hạn xử lý', 
      dataIndex: 'deadline', 
      key: 'deadline',
      render: (text: string) => text ? new Date(text).toLocaleDateString('vi-VN') : '---'
    },
    { 
      title: 'Độ ưu tiên', 
      dataIndex: 'priority', 
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'Cao' ? 'red' : priority === 'Trung bình' ? 'orange' : 'green'}>
          {priority}
        </Tag>
      )
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Hoàn thành' ? 'success' : status === 'Đang xử lý' ? 'processing' : 'default'}>
          {status}
        </Tag>
      )
    },
  ];

  return (
    <div style={{ marginTop: '24px', display: 'flex', gap: '24px' }}>
      <div style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '20px' }}>Công việc gần đây</h3>
        <Table 
          columns={columns} 
          dataSource={tasks} 
          rowKey="id" 
          pagination={{ pageSize: 5 }} 
        />
      </div>
    </div>
  );
};

export default DataSections;