// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
export const getTasks = async () => (await axios.get(`${API_BASE_URL}/tasks`)).data;
export const addTask = async (data: Record<string, unknown>) => (await axios.post(`${API_BASE_URL}/tasks`, data)).data;
export const updateTask = async (id: number, data: Record<string, unknown>) => (await axios.put(`${API_BASE_URL}/tasks/${id}`, data)).data;
export const deleteTask = async (id: number) => (await axios.delete(`${API_BASE_URL}/tasks/${id}`)).data;

