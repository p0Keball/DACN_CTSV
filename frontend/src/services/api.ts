// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Hàm lấy danh sách công việc[cite: 1, 2]
export const getTasks = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks`);
  return response.data;
};

// Hàm lấy số liệu thống kê[cite: 1]
export const getTaskStats = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks/stats`);
  return response.data;
};

export const syncStudentsByClass = async (classId: string) => {
  const response = await axios.post(`${API_BASE_URL}/students/sync`, { classId });
  return response.data;
};