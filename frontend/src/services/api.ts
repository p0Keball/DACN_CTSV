// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Gói 7: token admin lưu localStorage, tự gắn vào mọi request
export const setAuthToken = (token?: string) => {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
};
setAuthToken(localStorage.getItem('ctsv_token') || undefined);

// Hết hạn/không token mà gọi API ghi → đá về trang đăng nhập
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/dang-nhap') {
      localStorage.removeItem('ctsv_token');
      localStorage.removeItem('ctsv_user');
      window.location.href = '/dang-nhap';
    }
    return Promise.reject(err);
  }
);

export const login = async (username: string, password: string) =>
  (await axios.post(`${API_BASE_URL}/auth/login`, { username, password })).data;
export const logout = () => {
  localStorage.removeItem('ctsv_token');
  localStorage.removeItem('ctsv_user');
  setAuthToken(undefined);
};

// Hàm lấy số liệu thống kê
export const getTaskStats = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks/stats`);
  return response.data;
};

export const syncStudentsByClass = async (classId: string) => {
  const response = await axios.post(`${API_BASE_URL}/students/sync`, { classId });
  return response.data;
};

export const getStudents = async () => {
  const response = await axios.get(`${API_BASE_URL}/students`);
  return response.data;
};

export const getTeachers = async () => (await axios.get(`${API_BASE_URL}/teachers`)).data;
export const addTeacher = async (data: unknown) => (await axios.post(`${API_BASE_URL}/teachers`, data)).data;
export const getClasses = async () => (await axios.get(`${API_BASE_URL}/classes`)).data;
export const assignTeacherToClass = async (classCode: string, teacherId: number | null) => 
  (await axios.put(`${API_BASE_URL}/classes/${classCode}/assign`, { teacher_id: teacherId })).data;

export const updateTeacher = async (id: number, data: Record<string, unknown>) => (await axios.put(`${API_BASE_URL}/teachers/${id}`, data)).data;
export const deleteTeacher = async (id: number) => (await axios.delete(`${API_BASE_URL}/teachers/${id}`)).data;

export const addClass = async (data: Record<string, unknown>) => (await axios.post(`${API_BASE_URL}/classes`, data)).data;
export const updateClass = async (classCode: string, data: Record<string, unknown>) => (await axios.put(`${API_BASE_URL}/classes/${classCode}`, data)).data;
export const deleteClass = async (classCode: string) => (await axios.delete(`${API_BASE_URL}/classes/${classCode}`)).data;

export const addStudent = async (data: Record<string, unknown>) => (await axios.post(`${API_BASE_URL}/students`, data)).data;
export const updateStudent = async (studentId: string, data: Record<string, unknown>) => (await axios.put(`${API_BASE_URL}/students/${studentId}`, data)).data;
export const deleteStudent = async (studentId: string) => (await axios.delete(`${API_BASE_URL}/students/${studentId}`)).data;

// Quản lý Công việc
export const getTasks = async (params?: object) => (await axios.get(`${API_BASE_URL}/tasks`, { params })).data;
export const getTask = async (id: number) => (await axios.get(`${API_BASE_URL}/tasks/${id}`)).data;
export const addTask = async (data: Record<string, unknown>) => (await axios.post(`${API_BASE_URL}/tasks`, data)).data;
export const updateTask = async (id: number, data: Record<string, unknown>) => (await axios.put(`${API_BASE_URL}/tasks/${id}`, data)).data;
export const deleteTask = async (id: number) => (await axios.delete(`${API_BASE_URL}/tasks/${id}`)).data;

// File đính kèm
// Upload File & Link
export const getTaskAttachments = async (taskId: number) => (await axios.get(`${API_BASE_URL}/tasks/${taskId}/attachments`)).data;
export const addTaskAttachmentLink = async (taskId: number, file_url: string) => (await axios.post(`${API_BASE_URL}/tasks/${taskId}/attachments/link`, { file_url })).data;
export const uploadTaskFiles = async (taskId: number, formData: FormData) => (await axios.post(`${API_BASE_URL}/tasks/${taskId}/attachments/file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
export const deleteAttachment = async (id: number) => (await axios.delete(`${API_BASE_URL}/attachments/${id}`)).data;

// Người nhận email thật (§3.1) + lịch sử gửi + gửi email
export const getTaskRecipients = async (taskId: number) => (await axios.get(`${API_BASE_URL}/tasks/${taskId}/recipients`)).data;
export const addTaskRecipient = async (taskId: number, data: object) => (await axios.post(`${API_BASE_URL}/tasks/${taskId}/recipients`, data)).data;
export const deleteRecipient = async (id: number) => (await axios.delete(`${API_BASE_URL}/recipients/${id}`)).data;
export const getTaskHistory = async (taskId: number) => (await axios.get(`${API_BASE_URL}/tasks/${taskId}/history`)).data;
export const sendTaskEmail = async (taskId: number, send_type?: string) => (await axios.post(`${API_BASE_URL}/tasks/${taskId}/send`, { send_type })).data;

// Phân công sinh viên (tái dùng bảng task_assignments — Gói 4)
export const getTaskParticipants = async (taskId: number) => (await axios.get(`${API_BASE_URL}/tasks/${taskId}/participants`)).data;
export const addTaskParticipants = async (taskId: number, student_ids: string[]) => (await axios.post(`${API_BASE_URL}/tasks/${taskId}/participants`, { student_ids })).data;
export const updateParticipant = async (id: number, data: object) => (await axios.patch(`${API_BASE_URL}/participants/${id}`, data)).data;
export const deleteParticipant = async (id: number) => (await axios.delete(`${API_BASE_URL}/participants/${id}`)).data;

// Điểm danh 1 SV: chỉ task Kết thúc (mỗi bản ghi = 1 đơn vị điểm danh)
export const getStudentAttendance = async (studentId: string) =>
  (await axios.get(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/attendance`)).data;

// Báo cáo tổng hợp (Gói 6, chỉ đọc)
export const getTaskReport = async (params: { group?: string; from?: string; to?: string }) =>
  (await axios.get(`${API_BASE_URL}/reports/tasks`, { params })).data;
export const getSemesters = async () => (await axios.get(`${API_BASE_URL}/reports/semesters`)).data;
export const getParticipation = async (semester?: string, classCode?: string, extra?: { from?: string; to?: string }) =>
  (await axios.get(`${API_BASE_URL}/reports/participation`, { params: { ...(semester ? { semester } : {}), ...(classCode ? { class_code: classCode } : {}), ...(extra?.from ? { from: extra.from } : {}), ...(extra?.to ? { to: extra.to } : {}) } })).data;
export const getParticipationByClass = async (semester?: string, extra?: { from?: string; to?: string }) =>
  (await axios.get(`${API_BASE_URL}/reports/participation-by-class`, { params: { ...(semester ? { semester } : {}), ...(extra?.from ? { from: extra.from } : {}), ...(extra?.to ? { to: extra.to } : {}) } })).data;
export const getPerformance = async (params: { from?: string; to?: string; semester?: string }) =>
  (await axios.get(`${API_BASE_URL}/reports/performance`, { params })).data;

// Tủ hồ sơ (tab Hồ sơ): file gom theo tháng tạo công việc
export const getFilesLibrary = async () => (await axios.get(`${API_BASE_URL}/files/library`)).data;
export const searchFiles = async (params: { q?: string; type?: string; source?: string }) =>
  (await axios.get(`${API_BASE_URL}/files/search`, { params })).data;

// Danh bạ CC ban lãnh đạo (cụm Cc)
export const getCcContacts = async () => (await axios.get(`${API_BASE_URL}/cc-contacts`)).data;
export const addCcContact = async (data: object) => (await axios.post(`${API_BASE_URL}/cc-contacts`, data)).data;
export const updateCcContact = async (id: number, data: object) => (await axios.put(`${API_BASE_URL}/cc-contacts/${id}`, data)).data;
export const deleteCcContact = async (id: number) => (await axios.delete(`${API_BASE_URL}/cc-contacts/${id}`)).data;


