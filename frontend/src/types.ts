// Shared types & constants cho module Công việc
export const STATUS_OPTIONS = ['Mới tạo', 'Đã soạn', 'Đã gửi', 'Chờ phản hồi', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];
export const TASK_TYPE_OPTIONS = [
  { value: 'ThongBaoDon', label: 'Thông báo đơn (soạn + gửi là xong)' },
  { value: 'ChienDichPhanCong', label: 'Chiến dịch phân công (cần chọn lớp / theo dõi SV)' },
];

export interface Task {
  id: number;
  title: string;
  content: string;
  deadline: string;
  priority: string;
  status: string;
  source: string;
  semester: string;
  task_type?: string;
  ref_doc_number?: string;
  ref_issue_date?: string;
  remind_before_days?: number;
}

export interface Recipient {
  id?: number;
  recipient_email: string;
  recipient_name?: string;
  recipient_group?: string;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_url: string;
  file_type?: string;
}

export interface HistoryRow {
  id: number;
  recipient_email: string;
  subject: string;
  send_type?: string;
  status: string;
  sent_at?: string;
  created_at?: string;
}

// Một dòng phân công SV (bảng task_assignments join students)
export interface Participant {
  id: number;
  task_id: number;
  student_id: string;
  class_code: string | null;
  status: string;
  note?: string | null;
  FirstName?: string;
  LastName?: string;
  ClassStudentID?: string;
  Gender?: string;
  ClassRoleID?: number;
}

export const PARTICIPANT_STATUSES = ['Được phân công', 'Đã xác nhận', 'Đã tham gia', 'Vắng'];

export const statusColor = (status: string) => {
  if (status === 'Hoàn thành') return 'success';
  if (status === 'Quá hạn') return 'error';
  if (status === 'Đã gửi') return 'cyan';
  if (status === 'Chờ phản hồi') return 'purple';
  if (status === 'Đã soạn') return 'gold';
  return 'processing';
};
