import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Input, Select, Button, Tag, Space, Card, message, Modal, Descriptions, Badge, Tabs, Form, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';
import { syncStudentsByClass, getStudents, getTeachers, addTeacher, getClasses, assignTeacherToClass, updateTeacher, deleteTeacher, addClass, updateClass, deleteClass, addStudent, updateStudent, deleteStudent } from '../services/api';
import { exportToExcel } from '../utils/exportExcel';

const { Option } = Select;

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

interface Teacher {
  id: number;
  full_name: string;
  email: string;
  phone: string;
}

interface ClassItem {
  class_code: string;
  class_name: string;
  teacher_id: number | null;
  teacher_name: string | null;
}

// 1. Tách phần quản lý sinh viên hiện tại thành một component riêng (Tab 1)
const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const openAddStudent = () => { setEditingStudentId(null); form.resetFields(); setIsFormVisible(true); };
  const openEditStudent = (record: Student) => { setEditingStudentId(record.StudentID); form.setFieldsValue(record); setIsFormVisible(true); };

  

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents();
      if (res.success) {
        setStudents(res.data);
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isMounted) await loadStudents();
    };
    fetchData();
    return () => { isMounted = false; };
  }, [loadStudents]);

  const handleSync = async () => {
    if (selectedClass === 'all') {
      message.warning('Vui lòng chọn một lớp cụ thể để đồng bộ!');
      return;
    }
    setLoading(true);
    try {
      const res = await syncStudentsByClass(selectedClass);
      if (res.success) {
        message.success(`Đồng bộ thành công ${res.data.length} sinh viên lớp ${selectedClass}`);
        await loadStudents();
      } else {
        message.error(res.message || 'Lỗi đồng bộ dữ liệu');
      }
    } catch (error) {
      message.error('Không thể kết nối đến máy chủ Backend');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchClass = selectedClass === 'all' || student.ClassStudentID === selectedClass;
      const searchLower = searchText.toLowerCase();
      const mssv = student.StudentID.toLowerCase();
      const fullName = `${student.FirstName} ${student.LastName}`.toLowerCase();
      const reverseName = `${student.LastName} ${student.FirstName}`.toLowerCase();
      
      const matchSearch = mssv.includes(searchLower) || fullName.includes(searchLower) || reverseName.includes(searchLower);
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchText]);

  // Thêm sửa xóa sinh viên
  const handleSaveStudent = async (values: Record<string, unknown>) => {
    const res = editingStudentId ? await updateStudent(editingStudentId, values) : await addStudent(values);
    if (res.success) {
      message.success(`${editingStudentId ? 'Cập nhật' : 'Thêm'} sinh viên thành công!`);
      setIsFormVisible(false);
      loadStudents();
    } else message.error('Lỗi khi lưu sinh viên');
  };

  const handleDeleteStudent = async (id: string) => {
    const res = await deleteStudent(id);
    if (res.success) { message.success('Xóa thành công!'); loadStudents(); }
    else message.error('Lỗi khi xóa');
  };

  // 🔥 Xử lý sự kiện bấm nút Xuất Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      message.warning('Không có dữ liệu để xuất!');
      return;
    }

    const dataToExport = filteredStudents.map(student => ({
      ...student,
      ClassRoleID: student.ClassRoleID === 1 ? 'Lớp trưởng' : 'Sinh viên'
    }));

    const columnMapping = {
      StudentID: 'MSSV',
      FirstName: 'Họ và tên đệm',
      LastName: 'Tên',
      ClassStudentID: 'Lớp',
      BirthDay: 'Ngày sinh',
      Gender: 'Giới tính',
      ClassRoleID: 'Chức vụ',
      BirthPlace: 'Nơi sinh',
      PermanentResidence: 'Thường trú'
    };

    const fileName = selectedClass === 'all' ? 'Danh_sach_sinh_vien_Toan_Khoa' : `Danh_sach_sinh_vien_${selectedClass}`;
    exportToExcel(dataToExport, columnMapping, fileName);
    message.success('Đã tải xuống file Excel!');
  };

  const showStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalVisible(true);
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'StudentID', key: 'StudentID', width: '12%', sorter: (a: Student, b: Student) => a.StudentID.localeCompare(b.StudentID) },
    { title: 'Họ và tên', key: 'FullName', sorter: (a: Student, b: Student) => a.FirstName.localeCompare(b.FirstName), render: (_: unknown, record: Student) => `${record.FirstName} ${record.LastName}` },
    { title: 'Lớp', dataIndex: 'ClassStudentID', key: 'ClassStudentID', width: '12%', sorter: (a: Student, b: Student) => a.ClassStudentID.localeCompare(b.ClassStudentID) },
    { title: 'Ngày sinh', dataIndex: 'BirthDay', key: 'BirthDay', width: '15%' },
    { title: 'Giới tính', dataIndex: 'Gender', key: 'Gender', width: '10%', render: (gender: string) => <Tag color={gender === 'Nam' ? 'blue' : 'magenta'}>{gender}</Tag> },
    { title: 'Chức vụ', dataIndex: 'ClassRoleID', key: 'ClassRoleID', width: '15%', render: (role: number) => <Tag color={role === 1 ? 'gold' : 'default'}>{role === 1 ? 'Lớp trưởng' : 'Sinh viên'}</Tag> },
    { title: 'Thao tác', key: 'action', width: '15%', 
      render: (_: unknown, record: Student) => (
        <Space size="small">
          <Button type="link" style={{ color: '#237804', padding: 0 }} onClick={() => showStudentDetails(record)}>Chi tiết</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditStudent(record)} style={{ padding: 0 }} />
          <Popconfirm title="Xóa sinh viên này?" onConfirm={() => handleDeleteStudent(record.StudentID)}>
            <Button type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }} />
          </Popconfirm>
        </Space>
      ) }
  ];

  return (
    <div>
      <Card style={{ marginBottom: '20px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Space size="middle" wrap>
          <Input placeholder="Tìm kiếm theo MSSV hoặc Tên..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Select value={selectedClass} onChange={setSelectedClass} style={{ width: 150 }}>
            <Option value="all">Tất cả các lớp</Option>
            <Option value="ITK46A">ITK46A</Option>
            <Option value="ITK46B">ITK46B</Option>
            <Option value="ITK47A">ITK47A</Option>
            <Option value="ITK47B">ITK47B</Option>
            <Option value="ITK47C">ITK47C</Option>
            <Option value="ITK48A">ITK48A</Option>
            <Option value="ITK48B">ITK48B</Option>
            <Option value="ITK49A">ITK49A</Option>
            <Option value="ITK49B">ITK49B</Option>
            <Option value="ITK49C">ITK49C</Option>
          </Select>
          <Button type="primary" icon={<SyncOutlined />} loading={loading} onClick={handleSync}>
            Đồng bộ
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
            Xuất Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddStudent}>
            Thêm SV
          </Button>
        </Space>
      </Card>

      <Card style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Table columns={columns} dataSource={filteredStudents} rowKey="StudentID" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title={<div style={{ fontSize: '18px', color: '#237804', marginBottom: '16px' }}>Hồ sơ sinh viên</div>} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={[<Button key="close" onClick={() => setIsModalVisible(false)}>Đóng</Button>]} width={700}>
        {selectedStudent && (
          <Descriptions bordered column={2} size="small" labelStyle={{ width: '130px', background: '#fafafa', fontWeight: 500 }}>
            <Descriptions.Item label="Họ và tên" span={2}><strong style={{ fontSize: '15px' }}>{`${selectedStudent.FirstName} ${selectedStudent.LastName}`}</strong></Descriptions.Item>
            <Descriptions.Item label="Mã số SV">{selectedStudent.StudentID}</Descriptions.Item>
            <Descriptions.Item label="Lớp">{selectedStudent.ClassStudentID}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{selectedStudent.Gender}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{selectedStudent.BirthDay}</Descriptions.Item>
            <Descriptions.Item label="Chức vụ">{selectedStudent.ClassRoleID === 1 ? <Tag color="gold">Lớp trưởng</Tag> : 'Sinh viên'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{selectedStudent.IsInClass ? <Badge status="success" text="Đang theo học" /> : <Badge status="error" text="Đã nghỉ / Bảo lưu" />}</Descriptions.Item>
            <Descriptions.Item label="Chương trình ĐT" span={2}>{selectedStudent.StudyProgramID || '---'}</Descriptions.Item>
            <Descriptions.Item label="Nơi sinh" span={2}>{selectedStudent.BirthPlace || '---'}</Descriptions.Item>
            <Descriptions.Item label="Thường trú" span={2}>{selectedStudent.PermanentResidence || '---'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal title={editingStudentId ? "Sửa Sinh viên" : "Thêm Sinh viên"} open={isFormVisible} onCancel={() => setIsFormVisible(false)} onOk={() => form.submit()} width={600} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSaveStudent}>
          <Space style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="StudentID" label="MSSV" rules={[{ required: true }]} style={{ width: '150px' }}><Input disabled={!!editingStudentId} /></Form.Item>
            <Form.Item name="FirstName" label="Họ và tên đệm" rules={[{ required: true }]} style={{ width: '200px' }}><Input /></Form.Item>
            <Form.Item name="LastName" label="Tên" rules={[{ required: true }]} style={{ width: '150px' }}><Input /></Form.Item>
          </Space>
          <Space style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="ClassStudentID" label="Mã Lớp" rules={[{ required: true }]} style={{ width: '150px' }}><Input /></Form.Item>
            <Form.Item name="Gender" label="Giới tính" style={{ width: '150px' }}><Select options={[{value: 'Nam', label: 'Nam'}, {value: 'Nữ', label: 'Nữ'}]} /></Form.Item>
            <Form.Item name="BirthDay" label="Ngày sinh" style={{ width: '200px' }}><Input placeholder="DD/MM/YYYY" /></Form.Item>
          </Space>
          <Form.Item name="ClassRoleID" label="Chức vụ" style={{ width: '150px' }}><Select options={[{value: 0, label: 'Sinh viên'}, {value: 1, label: 'Lớp trưởng'}]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// --- COMPONENT: QUẢN LÝ GIẢNG VIÊN ---
const TeacherList: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadTeachers = useCallback(async () => {
    const res = await getTeachers();
    if (res.success) setTeachers(res.data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => { if (isMounted) await loadTeachers(); };
    fetchData();
    return () => { isMounted = false; };
  }, [loadTeachers]);

  const openAddForm = () => { setEditingId(null); form.resetFields(); setIsModalVisible(true); };
  const openEditForm = (record: Teacher) => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); };

  const handleSave = async (values: Omit<Teacher, 'id'>) => {
    const res = editingId ? await updateTeacher(editingId, values) : await addTeacher(values);
    if (res.success) {
      message.success(`${editingId ? 'Cập nhật' : 'Thêm'} giảng viên thành công!`);
      setIsModalVisible(false);
      loadTeachers();
    } else message.error('Lỗi khi lưu thông tin');
  };

  const handleDelete = async (id: number) => {
    const res = await deleteTeacher(id);
    if (res.success) { message.success('Xóa thành công!'); loadTeachers(); }
    else message.error('Lỗi khi xóa');
  };

  const columns = [
    { title: 'Họ và tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Thao tác', key: 'action', width: '15%',
      render: (_: unknown, record: Teacher) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditForm(record)} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAddForm} style={{ marginBottom: 16 }}>Thêm Giảng viên</Button>
      <Table columns={columns} dataSource={teachers} rowKey="id" pagination={{ pageSize: 10 }} />
      <Modal title={editingId ? "Sửa Giảng viên" : "Thêm Giảng viên mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    const [resClasses, resTeachers] = await Promise.all([getClasses(), getTeachers()]);
    if (resClasses.success) setClasses(resClasses.data);
    if (resTeachers.success) setTeachers(resTeachers.data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => { if (isMounted) await loadData(); };
    fetchData();
    return () => { isMounted = false; };
  }, [loadData]);

  const handleAssign = async (classCode: string, teacherId: number) => {
    const res = await assignTeacherToClass(classCode, teacherId);
    if (res.success) message.success(`Đã cập nhật GVCN cho lớp ${classCode}`);
  };

  const openAddForm = () => { setEditingCode(null); form.resetFields(); setIsModalVisible(true); };
  const openEditForm = (record: ClassItem) => { setEditingCode(record.class_code); form.setFieldsValue(record); setIsModalVisible(true); };

  const handleSave = async (values: Record<string, unknown>) => {
    const res = editingCode ? await updateClass(editingCode, values) : await addClass(values);
    if (res.success) {
      message.success(`${editingCode ? 'Cập nhật' : 'Thêm'} lớp học thành công!`);
      setIsModalVisible(false);
      loadData();
    } else message.error('Lỗi khi lưu lớp học');
  };

  const handleDelete = async (classCode: string) => {
    const res = await deleteClass(classCode);
    if (res.success) { message.success('Xóa thành công!'); loadData(); }
    else message.error('Lỗi khi xóa');
  };

  const columns = [
    { title: 'Mã lớp', dataIndex: 'class_code', key: 'class_code', width: '20%' },
    { title: 'Tên lớp', dataIndex: 'class_name', key: 'class_name', width: '30%' },
    {
      title: 'Giảng viên Chủ nhiệm', key: 'teacher_id',
      render: (_: unknown, record: ClassItem) => (
        <Select
          showSearch allowClear style={{ width: 250 }} placeholder="Chọn Giảng viên..."
          defaultValue={record.teacher_id} onChange={(val) => handleAssign(record.class_code, val)}
          options={teachers.map(t => ({ label: t.full_name, value: t.id }))}
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      )
    },
    {
      title: 'Thao tác', key: 'action', width: '15%',
      render: (_: unknown, record: ClassItem) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditForm(record)} />
          <Popconfirm title="Xóa lớp sẽ xóa toàn bộ sinh viên bên trong. Tiếp tục?" onConfirm={() => handleDelete(record.class_code)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={openAddForm} style={{ marginBottom: 16 }}>Thêm Lớp học</Button>
      <Table columns={columns} dataSource={classes} rowKey="class_code" pagination={false} />
      <Modal title={editingCode ? "Sửa Lớp học" : "Thêm Lớp học mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="class_code" label="Mã lớp (VD: ITK47A)" rules={[{ required: true }]}><Input disabled={!!editingCode} /></Form.Item>
          <Form.Item name="class_name" label="Tên lớp" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 2. Component bọc ngoài cùng chứa các Tab (Tab 2 và Tab 3 đang là Placeholder để code sau)
const AcademicManagement: React.FC = () => {
  const tabItems = [
    {
      key: '1',
      label: 'Danh sách Sinh viên',
      children: <StudentList />,
    },
    {
      key: '2',
      label: 'Giảng viên Chủ nhiệm',
      children: <TeacherList />,
    },
    {
      key: '3',
      label: 'Quản lý Lớp học',
      children: <ClassManagement />,
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Quản lý Đào tạo</h2>
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  );
};

export default AcademicManagement;