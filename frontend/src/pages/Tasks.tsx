import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { getTasks, addTask, updateTask, deleteTask } from '../services/api';

interface Task {
  id: number;
  title: string;
  content: string;
  deadline: string;
  priority: string;
  status: string;
  source: string;
  semester: string;
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadTasks = useCallback(async () => {
    const res = await getTasks();
    if (res.success) setTasks(res.data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => { if (isMounted) await loadTasks(); };
    fetchData();
    return () => { isMounted = false; };
  }, [loadTasks]);

  const openAddForm = () => { setEditingId(null); form.resetFields(); setIsModalVisible(true); };
  
  const openEditForm = (record: Task) => { 
    setEditingId(record.id); 
    form.setFieldsValue({
      ...record,
      deadline: record.deadline ? dayjs(record.deadline) : null,
    }); 
    setIsModalVisible(true); 
  };

  const handleSave = async (values: Record<string, unknown>) => {
    const deadlineValue = values.deadline as Dayjs | null;

    const payload = { 
      ...values, 
      deadline: deadlineValue ? deadlineValue.toISOString() : null 
    };
    
    const res = editingId ? await updateTask(editingId, payload) : await addTask(payload);
    
    if (res.success) {
      message.success(`${editingId ? 'Cập nhật' : 'Thêm'} công việc thành công!`);
      setIsModalVisible(false);
      loadTasks();
    } else {
      message.error('Lỗi khi lưu công việc');
    }
  };

  const handleDelete = async (id: number) => {
    const res = await deleteTask(id);
    if (res.success) { message.success('Xóa thành công!'); loadTasks(); }
    else message.error('Lỗi khi xóa');
  };

  const columns = [
    { title: 'Tiêu đề công việc', dataIndex: 'title', key: 'title', width: '30%',
      render: (text: string) => <strong style={{ color: '#237804' }}>{text}</strong>
    },
    { title: 'Học kỳ', dataIndex: 'semester', key: 'semester', width: '15%' },
    { title: 'Thời hạn (Deadline)', dataIndex: 'deadline', key: 'deadline',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Không có'
    },
    { title: 'Mức độ ưu tiên', dataIndex: 'priority', key: 'priority',
      render: (priority: string) => {
        const color = priority === 'Cao' ? 'red' : priority === 'Thấp' ? 'green' : 'orange';
        return <Tag color={color}>{priority}</Tag>;
      }
    },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (status: string) => {
        const color = status === 'Hoàn thành' ? 'success' : status === 'Quá hạn' ? 'error' : 'processing';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: 'Thao tác', key: 'action', width: '20%',
      render: (_: unknown, record: Task) => (
        <Space size="middle">
          <Button type="link" icon={<FileTextOutlined />}>Phân công</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditForm(record)} />
          <Popconfirm title="Xóa công việc này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Quản lý Công việc & Sự kiện</h2>
      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddForm} style={{ marginBottom: 16 }}>
          Tạo công việc mới
        </Button>
        <Table columns={columns} dataSource={tasks} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title={editingId ? "Sửa Công việc" : "Tạo Công việc mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} width={700} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="Tiêu đề công việc" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="VD: Xét học bổng Khuyến khích học tập HK2..." />
          </Form.Item>
          <Form.Item name="content" label="Nội dung / Trích yếu">
            <Input.TextArea rows={4} placeholder="Nhập mô tả chi tiết công việc..." />
          </Form.Item>
          
          <Space style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="semester" label="Học kỳ" rules={[{ required: true, message: 'Chọn học kỳ' }]}>
              <Select style={{ width: '200px' }} placeholder="VD: HK2 2025-2026" options={[
                { value: 'HK1 2025-2026', label: 'HK1 2025-2026' },
                { value: 'HK2 2025-2026', label: 'HK2 2025-2026' },
                { value: 'HK1 2026-2027', label: 'HK1 2026-2027' },
              ]} />
            </Form.Item>
            <Form.Item name="source" label="Nguồn công việc" initialValue="Thủ công">
              <Select style={{ width: '200px' }} options={[
                { value: 'Thủ công', label: 'Tạo thủ công' },
                { value: 'E-Office', label: 'Đồng bộ từ E-Office' },
                { value: 'OCR PDF', label: 'Trích xuất AI (OCR)' }
              ]} />
            </Form.Item>
          </Space>  

          <Space style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="deadline" label="Thời hạn (Deadline)" rules={[{ required: true }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '200px' }} />
            </Form.Item>
            <Form.Item name="priority" label="Mức độ ưu tiên" initialValue="Bình thường">
              <Select style={{ width: '150px' }} options={[{ value: 'Cao', label: 'Cao' }, { value: 'Bình thường', label: 'Bình thường' }, { value: 'Thấp', label: 'Thấp' }]} />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" initialValue="Mới tạo">
              <Select style={{ width: '150px' }} options={[{ value: 'Mới tạo', label: 'Mới tạo' }, { value: 'Đang xử lý', label: 'Đang xử lý' }, { value: 'Hoàn thành', label: 'Hoàn thành' }, { value: 'Quá hạn', label: 'Quá hạn' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;