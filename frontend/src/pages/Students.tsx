import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Input, Select, Button, Tag, Space, Card, message, Modal, 
  Descriptions, Badge, Tabs, Form, Popconfirm, Divider, List 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  SearchOutlined, DownloadOutlined, SyncOutlined, MailOutlined,
  PaperClipOutlined, SendOutlined
} from '@ant-design/icons';
import { 
  syncStudentsByClass, getStudents, getTeachers, addTeacher, 
  getClasses, assignTeacherToClass, updateTeacher, deleteTeacher, 
  addClass, updateClass, deleteClass, addStudent, updateStudent, deleteStudent,
  getTasks, getTaskAttachments
} from '../services/api';
import { exportToExcel } from '../utils/exportExcel';

const { Option } = Select;

//#region --- CÁC INTERFACE ---
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

interface Task {
  id: number;
  title: string;
  content: string;
  deadline: string;
  priority: string;
  status: string;
  semester?: string;
}

interface Attachment {
  id: number;
  file_name: string;
  file_url: string;
}
//#endregion


//#region --- COMPONENT: DANH SÁCH SINH VIÊN ---
interface StudentListProps {
  searchText: string;
  selectedClass: string;
  onExportAction: (action: () => void) => void;
}

const StudentList: React.FC<StudentListProps> = ({ searchText, selectedClass, onExportAction }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // --- STATE CHO MODAL SOẠN EMAIL CÔNG VIỆC ---
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskAttachments, setTaskAttachments] = useState<Attachment[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const openAddStudent = () => { setEditingStudentId(null); form.resetFields(); setIsFormVisible(true); };
  const openEditStudent = (record: Student) => { setEditingStudentId(record.StudentID); form.setFieldsValue(record); setIsFormVisible(true); };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents();
      if (res.success) setStudents(res.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu sinh viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) loadStudents();
    return () => { isMounted = false; };
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchClass = selectedClass === 'all' || student.ClassStudentID === selectedClass;
      const searchLower = searchText.toLowerCase();
      const mssv = student.StudentID.toLowerCase();
      const fullName = `${student.FirstName} ${student.LastName}`.toLowerCase();
      
      const matchSearch = mssv.includes(searchLower) || fullName.includes(searchLower);
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchText]);

  // Đăng ký hàm xuất Excel lên Component cha
  useEffect(() => {
    onExportAction(() => () => {
      if (filteredStudents.length === 0) {
        message.warning('Không có dữ liệu sinh viên để xuất!');
        return;
      }
      const dataToExport = filteredStudents.map(student => ({
        ...student,
        ClassRoleID: student.ClassRoleID === 1 ? 'Lớp trưởng' : 'Sinh viên'
      }));
      const columnMapping = { 
        StudentID: 'MSSV', FirstName: 'Họ và tên đệm', LastName: 'Tên', 
        ClassStudentID: 'Lớp', BirthDay: 'Ngày sinh', Gender: 'Giới tính', 
        ClassRoleID: 'Chức vụ', BirthPlace: 'Nơi sinh', PermanentResidence: 'Thường trú' 
      };
      const fileName = selectedClass === 'all' ? 'Danh_sach_sinh_vien' : `Danh_sach_sinh_vien_${selectedClass}`;
      exportToExcel(dataToExport, columnMapping, fileName);
    });
  }, [filteredStudents, selectedClass, onExportAction]);

  const handleSaveStudent = async (values: Record<string, unknown>) => {
    const res = editingStudentId ? await updateStudent(editingStudentId, values) : await addStudent(values);
    if (res.success) {
      message.success(`${editingStudentId ? 'Cập nhật' : 'Thêm'} sinh viên thành công!`);
      setIsFormVisible(false);
      loadStudents();
    } else message.error('Lỗi khi lưu thông tin sinh viên');
  };

  const handleDeleteMultiple = async () => {
    if (selectedRowKeys.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selectedRowKeys.map(id => deleteStudent(id as string)));
      message.success(`Đã xóa thành công ${selectedRowKeys.length} sinh viên`);
      setSelectedRowKeys([]);
      loadStudents();
    } catch (error) {
      message.error('Có lỗi xảy ra khi xóa nhiều sinh viên');
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ MỞ MODAL SOẠN EMAIL CÔNG VIỆC ---
  const handleOpenEmailModal = async () => {
    if (selectedRowKeys.length === 0) return;
    setIsEmailModalVisible(true);
    setLoadingTasks(true);
    setSelectedTaskId(null);
    setTaskAttachments([]);
    setEmailSubject('[DLU CTSV] Thông báo từ Phòng Công tác Sinh viên');
    
    // Tạo footer tiêu chuẩn
    const footer = `\n\n------------------------------------------------------\nPhòng Công tác Sinh viên (CTSV)\nTrường Đại học Đà Lạt (DLU)\nĐịa chỉ: 01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt\nEmail: ctsv@dlu.edu.vn\nĐiện thoại: 02633.xxx.xxx`;
    setEmailBody(`Kính gửi các bạn sinh viên,${footer}`);

    try {
      const res = await getTasks();
      if (res.success) {
        setAvailableTasks(res.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách công việc');
    } finally {
      setLoadingTasks(false);
    }
  };

  // Khi chọn 1 Công việc từ Dropdown
  const handleSelectTask = async (taskId: number) => {
    setSelectedTaskId(taskId);
    const task = availableTasks.find(t => t.id === taskId);
    if (!task) return;

    let attachments: Attachment[] = [];
    try {
      const res = await getTaskAttachments(taskId);
      if (res.success) {
        attachments = res.data;
        setTaskAttachments(res.data);
      }
    } catch {
      setTaskAttachments([]);
    }

    // Tự động dựng Tiêu đề & Nội dung
    setEmailSubject(`[DLU CTSV] ${task.title}`);

    let body = `Kính gửi các bạn sinh viên,\n\n`;
    body += `Phòng Công tác Sinh viên thông báo về công việc/sự kiện: "${task.title}".\n\n`;
    
    if (task.content) {
      body += `📌 NỘI DUNG CHI TIẾT:\n${task.content}\n\n`;
    }
    
    if (task.deadline) {
      const formattedDeadline = new Date(task.deadline).toLocaleString('vi-VN');
      body += `⏰ HẠN CHÓT THỰC HIỆN: ${formattedDeadline}\n\n`;
    }

    if (attachments.length > 0) {
      body += `📎 TỆP ĐÍNH KÈM / TÀI LIỆU LIÊN QUAN:\n`;
      attachments.forEach((att, idx) => {
        body += `${idx + 1}. ${att.file_name}: ${att.file_url}\n`;
      });
      body += `\n`;
    }

    body += `Đề nghị các bạn sinh viên chú ý theo dõi và thực hiện đúng thời hạn.\n\nTrân trọng!`;
    body += `\n\n------------------------------------------------------\nPhòng Công tác Sinh viên (CTSV)\nTrường Đại học Đà Lạt (DLU)\nĐịa chỉ: 01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt\nEmail: ctsv@dlu.edu.vn\nĐiện thoại: 02633.xxx.xxx`;

    setEmailBody(body);
  };

  // Tiến hành mở Gmail để gửi Email
  const handleSendEmailViaGmail = async () => {
    const emails = selectedRowKeys.map(id => `${id}@dlu.edu.vn`);
    const bccList = emails.join(', ');

    if (selectedRowKeys.length > 10) {
      try {
        await navigator.clipboard.writeText(bccList);
        message.success(`Đã sao chép ${selectedRowKeys.length} email! Hãy bấm Ctrl+V vào ô BCC trên Gmail.`);
      } catch (err) {
        message.warning('Không thể tự động chép email, vui lòng kiểm tra quyền truy cập Clipboard.');
      }

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank');
    } else {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank');
    }

    setIsEmailModalVisible(false);
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'StudentID', key: 'StudentID', width: '12%', sorter: (a: Student, b: Student) => a.StudentID.localeCompare(b.StudentID) },
    { title: 'Họ và tên', key: 'FullName', sorter: (a: Student, b: Student) => a.FirstName.localeCompare(b.FirstName), render: (_: unknown, record: Student) => `${record.FirstName} ${record.LastName}` },
    { title: 'Lớp', dataIndex: 'ClassStudentID', key: 'ClassStudentID', width: '12%' },
    { title: 'Ngày sinh', dataIndex: 'BirthDay', key: 'BirthDay', width: '15%' },
    { title: 'Giới tính', dataIndex: 'Gender', key: 'Gender', width: '10%', render: (gender: string) => <Tag color={gender === 'Nam' ? 'blue' : 'magenta'}>{gender}</Tag> },
    { title: 'Chức vụ', dataIndex: 'ClassRoleID', key: 'ClassRoleID', width: '15%', render: (role: number) => <Tag color={role === 1 ? 'gold' : 'default'}>{role === 1 ? 'Lớp trưởng' : 'Sinh viên'}</Tag> },
    { title: 'Thao tác', key: 'action', width: '15%', 
      render: (_: unknown, record: Student) => (
        <Space size="small">
          <Button type="link" style={{ color: '#237804', padding: 0 }} onClick={() => {setSelectedStudent(record); setIsModalVisible(true)}}>Chi tiết</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditStudent(record)} style={{ padding: 0 }} />
        </Space>
      ) }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddStudent}>Thêm Sinh Viên</Button>
        
        {/* Nút Gửi Email và Xóa khi có item được tick */}
        {selectedRowKeys.length > 0 && (
          <Space>
            <Button 
              icon={<MailOutlined />} 
              onClick={handleOpenEmailModal}
              style={{ backgroundColor: '#eab308', color: '#fff', borderColor: '#eab308' }}
            >
              Gửi Email ({selectedRowKeys.length})
            </Button>
            
            <Popconfirm title={`Bạn chắc chắn muốn xóa ${selectedRowKeys.length} sinh viên đã chọn?`} onConfirm={handleDeleteMultiple}>
              <Button danger icon={<DeleteOutlined />}>Xóa mục đã chọn</Button>
            </Popconfirm>
          </Space>
        )}
      </Space>

      <Table 
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} 
        columns={columns} 
        dataSource={filteredStudents} 
        rowKey="StudentID" 
        loading={loading} 
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
        }}
      />

      {/* --- MODAL SOẠN EMAIL CÔNG VIỆC GỬI SINH VIÊN --- */}
      <Modal
        title={<Space><MailOutlined style={{ color: '#eab308' }} /> Soạn Email Gửi Sinh Viên</Space>}
        open={isEmailModalVisible}
        onCancel={() => setIsEmailModalVisible(false)}
        width={750}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setIsEmailModalVisible(false)}>Hủy</Button>,
          <Button 
            key="send" 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSendEmailViaGmail}
            style={{ backgroundColor: '#eab308', borderColor: '#eab308' }}
          >
            Mở trên Gmail ({selectedRowKeys.length} SV)
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Chọn Công việc có sẵn (để chèn nội dung & file đính kèm)">
            <Select
              showSearch
              placeholder="-- Chọn công việc/thông báo --"
              loading={loadingTasks}
              value={selectedTaskId}
              onChange={handleSelectTask}
              optionFilterProp="children"
              allowClear
              onClear={() => {
                setSelectedTaskId(null);
                setTaskAttachments([]);
              }}
            >
              {availableTasks.map(t => (
                <Option key={t.id} value={t.id}>
                  [{t.semester || 'Thông báo'}] {t.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {taskAttachments.length > 0 && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
              <div style={{ fontWeight: 500, marginBottom: 8, color: '#389e0d' }}>
                <PaperClipOutlined /> Các file đính kèm trong công việc ({taskAttachments.length}):
              </div>
              <List
                size="small"
                dataSource={taskAttachments}
                renderItem={(item) => (
                  <List.Item key={item.id} style={{ padding: '4px 0' }}>
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      📄 {item.file_name}
                    </a>
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Form.Item label="Tiêu đề Email (Subject)" required>
            <Input 
              value={emailSubject} 
              onChange={(e) => setEmailSubject(e.target.value)} 
              placeholder="Nhập tiêu đề email..."
            />
          </Form.Item>

          <Form.Item label="Nội dung Email (Body)" required>
            <Input.TextArea 
              rows={10} 
              value={emailBody} 
              onChange={(e) => setEmailBody(e.target.value)} 
              placeholder="Nhập nội dung email..."
            />
          </Form.Item>

          <Tag color="blue">
            Sẽ gửi tới {selectedRowKeys.length} sinh viên đã chọn (qua ô BCC để bảo mật thông tin người nhận)
          </Tag>
        </Form>
      </Modal>

      {/* Modal Hồ Sơ Sinh Viên */}
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

      {/* Modal Thêm/Sửa Sinh Viên */}
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
          <Divider>Thông tin bổ sung</Divider>
          <Space style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="study_program" label="Chương trình ĐT">
              <Select placeholder="Chọn chương trình" style={{ width: '200px' }} options={[{ value: 'CQ23CT-PM', label: 'CQ23CT-PM' }, { value: 'CQ23CT-MMT', label: 'CQ23CT-MMT' }]} />
            </Form.Item>
            <Form.Item name="birth_place" label="Nơi sinh">
              <Input placeholder="VD: Lâm Đồng" style={{ width: '200px' }} />
            </Form.Item>
          </Space>
          <Form.Item name="permanent_residence" label="Thường trú">
            <Input placeholder="VD: Phường 8, TP. Đà Lạt, Lâm Đồng" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
//#endregion


//#region --- COMPONENT: QUẢN LÝ GIẢNG VIÊN ---
interface TeacherListProps {
  searchText: string;
}

const TeacherList: React.FC<TeacherListProps> = ({ searchText }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    const res = await getTeachers();
    if (res.success) setTeachers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
      t.email.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [teachers, searchText]);

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

  const handleDeleteMultiple = async () => {
    if (selectedRowKeys.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selectedRowKeys.map(id => deleteTeacher(id as number)));
      message.success(`Đã xóa thành công ${selectedRowKeys.length} giảng viên`);
      setSelectedRowKeys([]);
      loadTeachers();
    } catch (error) {
      message.error('Có lỗi xảy ra khi xóa giảng viên');
    } finally {
      setLoading(false);
    }
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
        </Space>
      )
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddForm}>Thêm Giảng viên</Button>
        {selectedRowKeys.length > 0 && (
          <Popconfirm title={`Xóa ${selectedRowKeys.length} giảng viên đã chọn?`} onConfirm={handleDeleteMultiple}>
            <Button danger icon={<DeleteOutlined />}>Xóa mục đã chọn</Button>
          </Popconfirm>
        )}
      </Space>

      <Table 
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={columns} 
        dataSource={filteredTeachers} 
        rowKey="id" 
        loading={loading}
        pagination={{
    defaultPageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
  }} />

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
//#endregion


//#region --- COMPONENT: QUẢN LÝ LỚP HỌC ---
interface ClassManagementProps {
  searchText: string;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ searchText }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [resClasses, resTeachers] = await Promise.all([getClasses(), getTeachers()]);
    if (resClasses.success) setClasses(resClasses.data);
    if (resTeachers.success) setTeachers(resTeachers.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      c.class_code.toLowerCase().includes(searchText.toLowerCase()) ||
      c.class_name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [classes, searchText]);

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
      <Table columns={columns} dataSource={filteredClasses} rowKey="class_code" loading={loading} pagination={false} />
      <Modal title={editingCode ? "Sửa Lớp học" : "Thêm Lớp học mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="class_code" label="Mã lớp (VD: ITK47A)" rules={[{ required: true }]}><Input disabled={!!editingCode} /></Form.Item>
          <Form.Item name="class_name" label="Tên lớp" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
//#endregion


//#region --- COMPONENT CHÍNH QUẢN LÝ BAO QUÁT ---
const AcademicManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('1');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Hàm trigger xuất Excel được truyền từ component con lên
  const [triggerExport, setTriggerExport] = useState<(() => void) | null>(null);

  const handleSync = async () => {
    if (activeTab === '1') {
      if (selectedClass === 'all') {
        message.warning('Vui lòng chọn một lớp cụ thể để đồng bộ sinh viên!');
        return;
      }
      setIsSyncing(true);
      try {
        const res = await syncStudentsByClass(selectedClass);
        if (res.success) {
          message.success(`Đồng bộ thành công ${res.data.length} sinh viên lớp ${selectedClass}`);
          // Bạn có thể kích hoạt reload data tại đây nếu dùng Redux/Context, 
          // Hoặc thiết kế thêm 1 flag refresh data truyền xuống con.
        } else {
          message.error(res.message || 'Lỗi đồng bộ dữ liệu');
        }
      } catch (error) {
        message.error('Không thể kết nối đến máy chủ');
      } finally {
        setIsSyncing(false);
      }
    } else {
      message.info('Tính năng đồng bộ hiện chỉ hỗ trợ cho Danh sách Sinh viên.');
    }
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', minHeight: '80vh' }}>
      
      {/* --- THANH CÔNG CỤ DÙNG CHUNG (TỐI TÂN) --- */}
      <Card style={{ marginBottom: '20px', background: '#f8f9fa' }} bodyStyle={{ padding: '16px' }}>
        <Space size="middle" wrap style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          
          <Space>
            <Input 
              placeholder={
                activeTab === '1' ? "Tìm kiếm MSSV, Tên sinh viên..." : 
                activeTab === '2' ? "Tìm kiếm Giảng viên, Email..." : 
                "Tìm kiếm Mã lớp, Tên lớp..."
              }
              prefix={<SearchOutlined />} 
              style={{ width: 350, borderRadius: '6px' }} 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
              allowClear
            />
            
            {/* Bộ lọc Lớp - Chỉ hiện khi ở Tab Sinh Viên */}
            {activeTab === '1' && (
              <Select value={selectedClass} onChange={setSelectedClass} style={{ width: 150 }}>
                <Option value="all">Tất cả lớp</Option>
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
            )}
          </Space>

          <Space>
            {activeTab === '1' && (
              <Button type="primary" icon={<SyncOutlined />} loading={isSyncing} onClick={handleSync}>
                Đồng bộ
              </Button>
            )}
            {activeTab === '1' && (
              <Button icon={<DownloadOutlined />} onClick={() => triggerExport && triggerExport()}>
                Xuất Excel
              </Button>
            )}
          </Space>

        </Space>
      </Card>

      {/* --- CÁC TAB CHỨA NỘI DUNG CHÍNH --- */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          { 
            key: '1', 
            label: 'Danh sách Sinh viên', 
            children: <StudentList searchText={searchText} selectedClass={selectedClass} onExportAction={setTriggerExport} /> 
          },
          { 
            key: '2', 
            label: 'Giảng viên Chủ nhiệm', 
            children: <TeacherList searchText={searchText} /> 
          },
          { 
            key: '3', 
            label: 'Quản lý Lớp học', 
            children: <ClassManagement searchText={searchText} /> 
          }
        ]} 
      />
    </div>
  );
};
//#endregion


export default AcademicManagement;