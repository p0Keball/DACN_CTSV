import React, { useState } from 'react';
import { Table, Input, Select, Button, Tag, Space, Card, message, Modal, Descriptions, Badge } from 'antd';
import { SearchOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';
import { syncStudentsByClass } from '../services/api';

const { Option } = Select;

// Bổ sung đầy đủ các trường dựa theo API
interface Student {
  StudentID: string;
  FirstName: string;
  LastName: string;
  ClassStudentID: string;
  BirthDay: string;
  Gender: string;
  ClassRoleID: number;
  BirthPlace?: string;
  PermanentResidence?: string;
  StudyProgramID?: string;
  IsInClass?: boolean;
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>('ITK47A');
  
  // State quản lý Modal chi tiết sinh viên
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSync = async () => {
    if (selectedClass === 'all') {
      message.warning('Vui lòng chọn một lớp cụ thể để đồng bộ!');
      return;
    }
    setLoading(true);
    try {
      const res = await syncStudentsByClass(selectedClass);
      if (res.success) {
        setStudents(res.data);
        message.success(`Đồng bộ thành công ${res.data.length} sinh viên lớp ${selectedClass}`);
      } else {
        message.error(res.message || 'Lỗi đồng bộ dữ liệu');
      }
    } catch (error) {
      message.error('Không thể kết nối đến máy chủ Backend');
    } finally {
      setLoading(false);
    }
  };

  // Hàm mở Modal và truyền dữ liệu sinh viên được chọn
  const showStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalVisible(true);
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'StudentID', key: 'StudentID', width: '12%' },
    { 
      title: 'Họ và tên', 
      key: 'FullName',
      render: (_: unknown, record: Student) => `${record.LastName} ${record.FirstName}`
    },
    { title: 'Lớp', dataIndex: 'ClassStudentID', key: 'ClassStudentID', width: '12%' },
    { title: 'Ngày sinh', dataIndex: 'BirthDay', key: 'BirthDay', width: '15%' },
    { 
      title: 'Giới tính', 
      dataIndex: 'Gender', 
      key: 'Gender',
      width: '10%',
      render: (gender: string) => (
        <Tag color={gender === 'Nam' ? 'blue' : 'magenta'}>{gender}</Tag>
      )
    },
    {
      title: 'Chức vụ',
      dataIndex: 'ClassRoleID',
      key: 'ClassRoleID',
      width: '15%',
      render: (role: number) => (
        <Tag color={role === 1 ? 'gold' : 'default'}>{role === 1 ? 'Lớp trưởng' : 'Sinh viên'}</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '10%',
      render: (_: unknown, record: Student) => (
        <Button 
          type="link" 
          style={{ color: '#237804', padding: 0 }} 
          onClick={() => showStudentDetails(record)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Quản lý Sinh viên & Lớp học</h2>
      
      <Card style={{ marginBottom: '20px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Space size="middle" wrap>
          <Input 
            placeholder="Tìm kiếm theo MSSV hoặc Tên..." 
            prefix={<SearchOutlined />} 
            style={{ width: 300 }}
          />
          <Select value={selectedClass} onChange={setSelectedClass} style={{ width: 150 }}>
            <Option value="all">Tất cả các lớp</Option>
            <Option value="ITK46A">ITK46A</Option>
            <Option value="ITK46B">ITK46B</Option>
            <Option value="ITK47A">ITK47A</Option>
            <Option value="ITK47C">ITK47C</Option>
            <Option value="ITK48A">ITK48A</Option>
          </Select>
          <Button type="primary" icon={<SyncOutlined />} loading={loading} onClick={handleSync}>
            Đồng bộ từ DLU Proxy
          </Button>
          <Button icon={<DownloadOutlined />}>
            Xuất Excel
          </Button>
        </Space>
      </Card>

      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Table 
          columns={columns} 
          dataSource={students} 
          rowKey="StudentID" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal chi tiết hồ sơ sinh viên */}
      <Modal
        title={<div style={{ fontSize: '18px', color: '#237804', marginBottom: '16px' }}>Hồ sơ sinh viên</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedStudent && (
          <Descriptions bordered column={2} size="small" labelStyle={{ width: '130px', background: '#fafafa', fontWeight: 500 }}>
            <Descriptions.Item label="Họ và tên" span={2}>
              <strong style={{ fontSize: '15px' }}>{`${selectedStudent.LastName} ${selectedStudent.FirstName}`}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Mã số SV">{selectedStudent.StudentID}</Descriptions.Item>
            <Descriptions.Item label="Lớp">{selectedStudent.ClassStudentID}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{selectedStudent.Gender}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{selectedStudent.BirthDay}</Descriptions.Item>
            <Descriptions.Item label="Chức vụ">
              {selectedStudent.ClassRoleID === 1 ? <Tag color="gold">Lớp trưởng</Tag> : 'Sinh viên'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selectedStudent.IsInClass ? (
                <Badge status="success" text="Đang theo học" />
              ) : (
                <Badge status="error" text="Đã nghỉ / Bảo lưu" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Chương trình ĐT" span={2}>
              {selectedStudent.StudyProgramID || '---'}
            </Descriptions.Item>
            <Descriptions.Item label="Nơi sinh" span={2}>
              {selectedStudent.BirthPlace || '---'}
            </Descriptions.Item>
            <Descriptions.Item label="Thường trú" span={2}>
              {selectedStudent.PermanentResidence || '---'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Students;