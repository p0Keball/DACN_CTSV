// Dữ liệu cho 5 thẻ thống kê trên cùng
export const statsData = [
  { title: 'Công việc đang xử lý', value: 28, change: '+12%', isUp: true, subText: 'so với tuần trước' },
  { title: 'Công việc đến hạn', value: 11, change: '+10%', isUp: true, subText: 'so với tuần trước' },
  { title: 'Quá hạn', value: 5, change: '-25%', isUp: false, subText: 'so với tuần trước' },
  { title: 'Hồ sơ chờ xử lý', value: 36, change: '+8%', isUp: true, subText: 'so với tuần trước' },
  { title: 'Hoàn thành tháng này', value: 72, change: '+15%', isUp: true, subText: 'so với tuần trước' },
];

// Dữ liệu cho Biểu đồ cột chồng (Tiến độ công việc theo tuần)
export const weeklyProgressData = [
  { week: 'Week 14', new: 12, processing: 8, completed: 18 },
  { week: 'Week 15', new: 18, processing: 10, completed: 16 },
  { week: 'Week 16', new: 16, processing: 11, completed: 15 },
  { week: 'Week 17', new: 17, processing: 8, completed: 14 },
  { week: 'Week 18', new: 14, processing: 9, completed: 15 },
  { week: 'Week 19', new: 18, processing: 13, completed: 14 },
  { week: 'Week 20', new: 11, processing: 5, completed: 20 },
];

// Dữ liệu cho Biểu đồ tròn (Cơ cấu trạng thái công việc)
export const taskStatusData = [
  { name: 'Đang xử lý', value: 20, color: '#1677ff' },
  { name: 'Hoàn thành', value: 18, color: '#52c41a' },
  { name: 'Chờ phản hồi', value: 18, color: '#faad14' },
  { name: 'Mới', value: 18, color: '#ff7a45' },
];

// Dữ liệu cho Bảng "Công việc gần đây"
export const recentTasksData = [
  { key: '1', name: 'Rà soát minh chứng rèn luyện HK2', deadline: '20/05/2026', priority: 'Cao', assignee: 'Nguyễn Văn A', status: 'Chờ phản hồi' },
  { key: '2', name: 'Thống kê sinh viên thi tốt nghiệp', deadline: '17/05/2026', priority: 'Cao', assignee: 'Lê Văn B', status: 'Đang xử lý' },
  { key: '3', name: 'Thống kê sinh viên thi tốt nghiệp', deadline: '12/05/2026', priority: 'Cao', assignee: 'Lê Văn C', status: 'Đang xử lý' },
  { key: '4', name: 'Thống kê sinh viên thi tốt nghiệp', deadline: '17/05/2026', priority: 'Trung bình', assignee: 'Lê Văn D', status: 'Đang xử lý' },
];

// Dữ liệu cho Danh sách "Công việc sắp đến hạn"
export const upcomingTasksData = [
  { id: '1', title: 'Xét học bổng khuyến khích HK2', deadline: '20/05' },
  { id: '2', title: 'Xác nhận SV vay vốn NHCSXH', deadline: '22/05' },
  { id: '3', title: 'Xác nhận SV vay vốn NHCSXH', deadline: '21/05' },
  { id: '4', title: 'Xử lý đơn xin bảo lưu HĐ', deadline: '27/05' },
  { id: '5', title: 'Rà soát minh chứng rèn luyện HK2', deadline: '28/05' },
];

// Dữ liệu cho Bảng "Danh sách sinh viên / hồ sơ cần chú ý"
export const studentAttentionData = [
  { key: '1', name: 'Huỳnh Tuấn Long', mssv: '2347C035', class: 'ITK47C', status: 'Thiếu thông tin' },
  { key: '2', name: 'Huỳnh Tuấn Long', mssv: '2347C035', class: 'ITK47C', status: 'Thiếu thông tin' },
];

// Dữ liệu cho Khối "Báo cáo nhanh / Thống kê theo tháng" ở chân trang
export const monthlyReportData = [
  { title: 'Tổng công việc', value: 120, change: '+18% so với tháng trước', type: 'total' },
  { title: 'Hoàn thành', value: 72, change: '+15% so với tháng trước', type: 'completed' },
  { title: 'Đang xử lý', value: 38, change: '+8% so với tháng trước', type: 'processing' },
  { title: 'Quá hạn', value: 10, change: '-25% so với tháng trước', type: 'overdue' },
  { title: 'Hồ sơ xử lý', value: 150, change: '+12% so với tháng trước', type: 'pending' },
  { title: 'Hồ sơ xử lý', value: 72, change: '+15% so với tháng trước', type: 'done' },
];