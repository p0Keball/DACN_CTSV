import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Space, Card, Form, Input, InputNumber, Select, DatePicker, message, notification, Tag, Upload, Alert, Spin, Table, Modal } from 'antd';
import { SendOutlined, SaveOutlined, ArrowLeftOutlined, InboxOutlined, LinkOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTasks, getStudents, addTask, updateTask, addTaskAttachmentLink, uploadTaskFiles,
  getTaskRecipients, addTaskRecipient, deleteRecipient, sendTaskEmail, getClasses, getTeachers,
  getTaskParticipants, addTaskParticipants, deleteParticipant,
  addTeacher, updateTeacher, deleteTeacher, addClass, updateClass, deleteClass,
  getCcContacts, addCcContact, updateCcContact, deleteCcContact,
} from '../services/api';
import { STATUS_OPTIONS, TASK_TYPE_OPTIONS } from '../types';
import type { Recipient } from '../types';
import EmailEditor from '../components/EmailEditor';
import DirectoryModal from '../components/DirectoryModal';
import './TaskCompose.css';

interface TaskComposeProps {
  /** Tab mode truyền vào (null = soạn mới). Bỏ qua = đọc :id từ route (deep-link). */
  taskId?: number | null;
  onTitleChange?: (title: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Gọi sau Lưu nháp/Gửi thành công: tab mode đóng tab, route mode về danh sách. */
  onDone?: () => void;
  /** Nút Danh sách: tab mode quay về tab danh sách (giữ nháp), route mode navigate. */
  onBack?: () => void;
}

const { Dragger } = Upload;

// Preset "Tất cả GV + Lớp" — danh sách email khoa (cứng trong code; đổi khi nhân sự đổi)
const PRESET_GV = [
  { email: 'conglg@dlu.edu.vn', name: 'Công Lê Gia' },
  { email: 'hieunt@dlu.edu.vn', name: 'Hiếu Nguyễn Trọng' },
  { email: 'khuedm@dlu.edu.vn', name: 'Khuê Đoàn Minh' },
  { email: 'linhttp@dlu.edu.vn', name: 'Linh Trần Thị Phương' },
  { email: 'anhlt@dlu.edu.vn', name: 'Lê Thiên Anh' },
  { email: 'ngaptt@dlu.edu.vn', name: 'Nga Phan Thị Thanh' },
  { email: 'phuctv@dlu.edu.vn', name: 'Phúc Trần Vĩnh' },
  { email: 'quanvm@dlu.edu.vn', name: 'Quan Vũ Minh' },
  { email: 'thanglq@dlu.edu.vn', name: 'Thắng La Quốc' },
  { email: 'dungnvh@dlu.edu.vn', name: 'Dũng Nguyễn Văn Huy' },
  { email: 'khoadv@dlu.edu.vn', name: 'Khoa Đỗ Văn' },
  { email: 'quangtn@dlu.edu.vn', name: 'Quang Trần Nhật' },
];
const PRESET_LOP = [
  'ctk49a@dlu.edu.vn', 'ctk49b@dlu.edu.vn', 'ctk49c@dlu.edu.vn',
  'ctk48a@dlu.edu.vn', 'ctk48b@dlu.edu.vn',
  'ctk47a@dlu.edu.vn', 'ctk47b@dlu.edu.vn', 'ctk47c@dlu.edu.vn',
  'ctk50a@dlu.edu.vn', 'ctk50b@dlu.edu.vn',
  'ctk46a@dlu.edu.vn', 'ctk46b@dlu.edu.vn',
];

// Trang Soạn công việc (Gói 2b): layout 2 cột — cột trái là luồng soạn chính
// (Tiêu đề → Nội dung → Người nhận kề nhau), cột phải sticky là Thiết lập + File.
// Hành vi giữ nguyên — rich text + phân công SV làm ở Gói 3/4.
interface StudentRow {
  StudentID: string;
  FirstName: string;
  LastName: string;
  ClassStudentID: string;
  ClassRoleID?: number;
}

const TaskCompose: React.FC<TaskComposeProps> = (props) => {
  const { taskId: taskIdProp, onDone, onBack, onTitleChange: onTitleProp, onDirtyChange: onDirtyProp } = props;
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Tab mode truyền taskId (kể cả null = soạn mới); deep-link route thì đọc params
  const editingId = taskIdProp !== undefined ? taskIdProp : (routeId ? Number(routeId) : null);
  const done = () => { if (onDone) onDone(); else navigate('/cong-viec'); };
  const back = () => { if (onBack) onBack(); else navigate('/cong-viec'); };
  // Ref cho callbacks để effect load không phải re-run khi parent re-render
  const onDoneRef = useRef(onDone);
  const onTitleRef = useRef(onTitleProp);
  const onDirtyRef = useRef(onDirtyProp);
  useEffect(() => {
    onDoneRef.current = onDone;
    onTitleRef.current = onTitleProp;
    onDirtyRef.current = onDirtyProp;
  });
  const stableDone = useCallback(() => {
    if (onDoneRef.current) onDoneRef.current(); else navigate('/cong-viec');
  }, [navigate]);

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [sourceWatch, setSourceWatch] = useState<string>('Thủ công');
  const [taskTypeWatch, setTaskTypeWatch] = useState<string>('ThongBaoDon');
  const [currentStatus, setCurrentStatus] = useState<string>('Mới tạo');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [touched, setTouched] = useState(false);
  // Debounce tên tab: ô Tiêu đề gõ vẫn mượt, tên tab cập nhật sau 300ms ngừng gõ
  const titleTimer = useRef<number | null>(null);
  useEffect(() => () => { if (titleTimer.current) window.clearTimeout(titleTimer.current); }, []);
  const [recipDrafts, setRecipDrafts] = useState<Recipient[]>([]);
  const [recipEmail, setRecipEmail] = useState('');
  const [recipName, setRecipName] = useState('');
  const [classes, setClasses] = useState<Array<{ class_code: string; class_name: string; teacher_id: number | null; teacher_name: string | null; email?: string | null }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: number; full_name: string; email: string }>>([]);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Cụm Cc (ban lãnh đạo): toggle mặc định bật; tắt thì gỡ cả cụm khỏi người nhận
  const [ccOn, setCcOn] = useState(true);
  const [ccList, setCcList] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const ccSeeded = useRef(false);

  // Khối Phân công SV (Gói 4): state giữ theo MSSV, không mất khi đổi lớp xem
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [assignClasses, setAssignClasses] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState(false);

  useEffect(() => {
    getClasses().then(res => { if (res.success) setClasses(res.data); }).catch(() => undefined);
    getTeachers().then(res => { if (res.success) setTeachers(res.data); }).catch(() => undefined);
    getStudents().then(res => { if (res.success) setAllStudents(res.data); }).catch(() => undefined);
    getCcContacts().then(res => { if (res.success) setCcList(res.data); }).catch(() => undefined);
  }, []);

  // Soạn mới + toggle CC đang bật: tự đưa cụm Cc vào (im lặng, không toast)
  useEffect(() => {
    if (editingId || !ccOn || ccList.length === 0 || ccSeeded.current) return;
    ccSeeded.current = true;
    setRecipDrafts(prev => {
      const existing = new Set(prev.map(r => r.recipient_email.toLowerCase()));
      const adds = ccList
        .filter(c => c.email && !existing.has(c.email.toLowerCase()))
        .map(c => ({ recipient_email: c.email, recipient_name: c.name, recipient_group: 'Ban lãnh đạo', kind: 'cc' }));
      return [...prev, ...adds];
    });
  }, [editingId, ccOn, ccList]);

  useEffect(() => {
    if (!editingId) return;
    let isMounted = true;
    (async () => {
      try {
        const [tasksRes, recipRes, partRes] = await Promise.all([getTasks(), getTaskRecipients(editingId), getTaskParticipants(editingId)]);
        if (!isMounted) return;
        const task = tasksRes.success ? tasksRes.data.find((t: { id: number }) => t.id === editingId) : null;
        if (!task) { message.error('Không tìm thấy công việc'); stableDone(); return; }
        form.setFieldsValue({
          ...task,
          deadline: task.deadline ? dayjs(task.deadline) : null,
          ref_issue_date: task.ref_issue_date ? dayjs(task.ref_issue_date) : null,
        });
        setSourceWatch(task.source || 'Thủ công');
        setTaskTypeWatch(task.task_type || 'ThongBaoDon');
        setCurrentStatus(task.status || 'Mới tạo');
        setTouched(false);
        onTitleRef.current?.(task.title || '');
        onDirtyRef.current?.(false);
        if (recipRes.success) setRecipDrafts(recipRes.data);
        if (partRes.success) {
          const ids = partRes.data.map((p: { student_id: string }) => p.student_id);
          setSelectedStudents(ids);
          if ((task.task_type || 'ThongBaoDon') === 'ChienDichPhanCong' || ids.length > 0) setAssignOpen(true);
        } else if ((task.task_type || 'ThongBaoDon') === 'ChienDichPhanCong') {
          setAssignOpen(true);
        }
      } catch { message.error('Không tải được công việc'); }
      finally { if (isMounted) setLoading(false); }
    })();
    return () => { isMounted = false; };
  }, [editingId, form, navigate, stableDone]);

  const teacherById = (tid: number | null) => teachers.find(t => t.id === tid);

  // Báo dirty về tab cha: đã gõ form, đã thêm người nhận/file/SV phân công
  useEffect(() => {
    onDirtyRef.current?.(touched || recipDrafts.length > 0 || fileList.length > 0 || selectedStudents.length > 0);
  }, [touched, recipDrafts, fileList, selectedStudents]);

  const handleFormChange = (changed: Record<string, unknown>) => {
    setTouched(true);
    if (changed && typeof changed.title === 'string') {
      const v = changed.title;
      if (titleTimer.current) window.clearTimeout(titleTimer.current);
      titleTimer.current = window.setTimeout(() => onTitleRef.current?.(v), 300);
    }
  };

  const addDraftRecipient = () => {
    const email = recipEmail.trim();
    if (!email || !email.includes('@')) { message.warning('Nhập email người nhận hợp lệ'); return; }
    if (recipDrafts.some(r => r.recipient_email.toLowerCase() === email.toLowerCase())) {
      message.warning('Email này đã có trong danh sách'); return;
    }
    setRecipDrafts(prev => [...prev, { recipient_email: email, recipient_name: recipName.trim() || undefined, recipient_group: 'Tay' }]);
    setRecipEmail('');
    setRecipName('');
  };

  // Danh bạ đọc từ DB (GV ← teachers, Lớp ← classes.email); DB trống mới rớt về cứng
  const classesWithEmail = classes.filter(c => c.email);
  const usingFallback = teachers.length === 0 && classesWithEmail.length === 0;
  const dirGv: Array<{ name: string; email: string }> = teachers.length > 0
    ? teachers.filter(t => t.email).map(t => ({ name: t.full_name, email: t.email }))
    : PRESET_GV;
  const dirLop: Array<{ name: string; email: string }> = classesWithEmail.length > 0
    ? classesWithEmail.map(c => ({ name: `Lớp ${c.class_code}`, email: c.email as string }))
    : PRESET_LOP.map(email => ({ name: `Lớp ${email.split('@')[0].toUpperCase()}`, email }));

  // Thêm hàng loạt có Hoàn tác (snapshot trước khi thêm)
  const bulkAdd = (items: Recipient[], label: string) => {
    const snapshot = recipDrafts;
    setRecipDrafts(prev => {
      const existing = new Set(prev.map(r => r.recipient_email.toLowerCase()));
      const adds = items.filter(it => {
        const key = it.recipient_email.toLowerCase();
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      return [...prev, ...adds];
    });
    notification.success({
      message: `Đã thêm ${label}`,
      btn: <Button size="small" onClick={() => { setRecipDrafts(snapshot); notification.destroy(); message.info('Đã hoàn tác'); }}>Hoàn tác</Button>,
      duration: 6,
    });
  };

  const addAllGvAndClasses = () => bulkAdd(
    [
      ...dirGv.map(g => ({ recipient_email: g.email, recipient_name: g.name, recipient_group: 'GV' })),
      ...dirLop.map(l => ({ recipient_email: l.email, recipient_name: l.name, recipient_group: 'Lớp' })),
    ],
    `Tất cả GV + Lớp (${dirGv.length} GV, ${dirLop.length} lớp)`
  );

  const addGvOnly = () => bulkAdd(
    dirGv.map(g => ({ recipient_email: g.email, recipient_name: g.name, recipient_group: 'GV' })),
    `Giảng viên (${dirGv.length})`
  );

  const addLopOnly = () => bulkAdd(
    dirLop.map(l => ({ recipient_email: l.email, recipient_name: l.name, recipient_group: 'Lớp' })),
    `Lớp (${dirLop.length})`
  );

  // Ghi danh bạ thẳng vào DB (popup Danh bạ gọi)
  const dirAddTeacher = async (name: string, email: string) => {
    try {
      const res = await addTeacher({ full_name: name, email });
      if (!res.success) throw new Error();
      const r = await getTeachers();
      if (r.success) setTeachers(r.data);
      message.success('Đã thêm giảng viên vào danh bạ');
    } catch { message.error('Không thêm được (có thể email đã tồn tại)'); }
  };

  const dirUpdateTeacher = async (id: number, patch: { full_name?: string; email?: string }) => {
    try {
      const res = await updateTeacher(id, patch);
      if (!res.success) throw new Error();
      setTeachers(prev => prev.map(t => (t.id === id ? { ...t, ...patch } as typeof t : t)));
      message.success('Đã cập nhật giảng viên');
    } catch { message.error('Không cập nhật được'); }
  };

  const dirDeleteTeacher = async (id: number) => {
    try {
      const res = await deleteTeacher(id);
      if (!res.success) throw new Error();
      setTeachers(prev => prev.filter(t => t.id !== id));
      message.success('Đã xóa khỏi danh bạ');
    } catch { message.error('Không xóa được'); }
  };

  const dirAddClass = async (code: string, email: string) => {
    try {
      const res = await addClass({ class_code: code, email });
      if (!res.success) throw new Error();
      const r = await getClasses();
      if (r.success) setClasses(r.data);
      message.success('Đã thêm lớp vào danh bạ');
    } catch { message.error('Không thêm được (có thể mã lớp đã tồn tại)'); }
  };

  const dirUpdateClassEmail = async (code: string, email: string) => {
    try {
      const res = await updateClass(code, { email });
      if (!res.success) throw new Error();
      setClasses(prev => prev.map(c => (c.class_code === code ? { ...c, email } : c)));
      message.success('Đã cập nhật hòm thư lớp');
    } catch { message.error('Không cập nhật được'); }
  };

  const dirDeleteClass = async (code: string) => {
    try {
      const res = await deleteClass(code);
      if (!res.success) throw new Error();
      setClasses(prev => prev.filter(c => c.class_code !== code));
      message.success('Đã xóa lớp khỏi danh bạ');
    } catch { message.error('Không xóa được'); }
  };

  const dirAddCc = async (name: string, email: string) => {
    try {
      const res = await addCcContact({ name, email });
      if (!res.success) throw new Error();
      const r = await getCcContacts();
      if (r.success) setCcList(r.data);
      message.success('Đã thêm vào cụm Cc');
    } catch { message.error('Không thêm được (có thể email đã tồn tại)'); }
  };

  const dirUpdateCc = async (id: number, patch: { name?: string; email?: string }) => {
    try {
      const res = await updateCcContact(id, patch);
      if (!res.success) throw new Error();
      setCcList(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
      message.success('Đã cập nhật cụm Cc');
    } catch { message.error('Không cập nhật được'); }
  };

  const dirDeleteCc = async (id: number) => {
    try {
      const res = await deleteCcContact(id);
      if (!res.success) throw new Error();
      setCcList(prev => prev.filter(c => c.id !== id));
      // Gỡ luôn khỏi danh sách đang soạn (nếu có)
      setRecipDrafts(prev => prev.filter(r => r.kind !== 'cc' || !ccList.some(c => c.id === id && c.email.toLowerCase() === r.recipient_email.toLowerCase())));
      message.success('Đã xóa khỏi cụm Cc');
    } catch { message.error('Không xóa được'); }
  };

  const recipTag = (r: Recipient) => (
    <Tag
      key={r.recipient_email}
      closable
      onClose={() => setRecipDrafts(prev => prev.filter(x => x.recipient_email !== r.recipient_email))}
      style={{ marginBottom: 4 }}
    >
      {r.recipient_name ? `${r.recipient_name} <${r.recipient_email}>` : r.recipient_email}
    </Tag>
  );

  const addGvcnOfClass = (classCode: string) => {
    const cls = classes.find(c => c.class_code === classCode);
    if (!cls?.teacher_id) { message.warning(`Lớp ${classCode} chưa gán GVCN`); return; }
    const t = teacherById(cls.teacher_id);
    if (!t?.email) { message.warning('GVCN chưa có email'); return; }
    if (recipDrafts.some(r => r.recipient_email.toLowerCase() === t.email.toLowerCase())) {
      message.warning('Đã có trong danh sách'); return;
    }
    setRecipDrafts(prev => [...prev, { recipient_email: t.email, recipient_name: `${t.full_name} (GVCN ${classCode})`, recipient_group: 'GVCN' }]);
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stripHtml = (s: string) =>
    s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  const suggestContent = () => {
    const rawContent = String(form.getFieldValue('content') || '');
    const trichYeu = stripHtml(rawContent);
    const refNo = form.getFieldValue('ref_doc_number') || '';
    if (!trichYeu && !refNo) { message.info('Nhập trích yếu / số văn bản eOffice trước để gợi ý'); return; }
    const refText = refNo ? `số ${escapeHtml(String(refNo))}` : 'của nhà trường';
    const quoteText = trichYeu ? `"${escapeHtml(String(trichYeu))}"` : '';
    // Nội dung editor giờ là HTML: trích yếu văn bản vẫn phải escape trước khi nhét vào
    const draft =
      `<p>Kính gửi quý thầy/cô,</p>` +
      `<p>Căn cứ văn bản ${refText} với nội dung: ${quoteText}.</p>` +
      `<p>Trợ lý CTSV đề nghị quý thầy/cô phối hợp thực hiện và phản hồi trước deadline nêu trên.</p>` +
      `<p>Trân trọng cảm ơn!</p>`;
    form.setFieldsValue({ content: draft });
    message.success('Đã gợi ý nội dung email — bạn sửa lại trước khi gửi');
  };

  // persistTask: lưu task + recipients + attachments, trả về taskId
  const persistTask = async (status: string): Promise<number> => {
    const values = await form.validateFields();
    const deadlineValue = values.deadline as unknown as { toISOString: () => string } | null;
    const refDateValue = values.ref_issue_date as unknown as { toISOString?: () => string } | null;
    const payload = {
      ...values,
      deadline: deadlineValue ? (deadlineValue as unknown as { toISOString: () => string }).toISOString() : null,
      ref_issue_date: refDateValue ? dayjs((refDateValue as unknown as { toISOString?: () => string }).toISOString ? (refDateValue as unknown as { toISOString: () => string }).toISOString() : undefined).format('YYYY-MM-DD') : (values.ref_issue_date ? dayjs(values.ref_issue_date).format('YYYY-MM-DD') : null),
      status,
    };
    delete (payload as Record<string, unknown>).drive_link;

    const taskRes = editingId ? await updateTask(editingId, payload) : await addTask(payload);
    if (!taskRes.success) throw new Error('Lỗi khi lưu công việc');
    const taskId: number = editingId || taskRes.data.id;

    // Đồng bộ recipients: lấy danh sách cũ, xóa cái bị gỡ, thêm cái mới
    if (editingId) {
      const oldRes = await getTaskRecipients(taskId);
      const oldList: Array<{ id: number; recipient_email: string }> = oldRes.success ? oldRes.data : [];
      const draftEmails = new Set(recipDrafts.map(r => r.recipient_email.toLowerCase()));
      for (const o of oldList) {
        if (!draftEmails.has(o.recipient_email.toLowerCase()) && (o as { id: number }).id) {
          await deleteRecipient((o as { id: number }).id);
        }
      }
      const oldEmails = new Set(oldList.map(o => o.recipient_email.toLowerCase()));
      for (const r of recipDrafts) {
        if (!oldEmails.has(r.recipient_email.toLowerCase())) {
          await addTaskRecipient(taskId, r);
        }
      }
    } else {
      for (const r of recipDrafts) {
        await addTaskRecipient(taskId, r);
      }
    }

    if (values.drive_link) {
      await addTaskAttachmentLink(taskId, values.drive_link as string);
    }

    // Đồng bộ phân công SV: thêm mới bulk, gỡ cái bị bỏ chọn (chỉ khi sửa)
    const partRes = await getTaskParticipants(taskId);
    const oldParts: Array<{ id: number; student_id: string }> = partRes.success ? partRes.data : [];
    const oldIds = new Set(oldParts.map(p => p.student_id));
    const newIds = new Set(selectedStudents);
    const toAdd = selectedStudents.filter(sid => !oldIds.has(sid));
    if (toAdd.length > 0) {
      await addTaskParticipants(taskId, toAdd);
    }
    if (editingId) {
      for (const p of oldParts) {
        if (!newIds.has(p.student_id)) {
          await deleteParticipant(p.id);
        }
      }
    }

    if (fileList.length > 0) {
      const formData = new FormData();
      fileList.forEach(file => {
        const actualFile = file.originFileObj || file;
        formData.append('files', actualFile as unknown as Blob);
      });
      await uploadTaskFiles(taskId, formData);
    }
    return taskId;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistTask('Đã soạn');
      message.success('Đã lưu nháp (trạng thái: Đã soạn)');
      done();
    } catch {
      message.error('Có lỗi khi lưu nháp!');
    } finally { setSaving(false); }
  };

  const handleSend = async () => {
    if (recipDrafts.length === 0) { message.warning('Hãy thêm ít nhất 1 người nhận trước khi gửi'); return; }
    setSaving(true);
    try {
      const taskId = await persistTask('Đã soạn');
      const res = await sendTaskEmail(taskId, 'Gửi lần đầu');
      if (!res.success) throw new Error(res.message || 'Gửi thất bại');
      message.success(`Đã gửi email tới ${res.data.length} người nhận`);
      done();
    } catch (e) {
      message.error((e as Error).message || 'Có lỗi khi gửi email!');
    } finally { setSaving(false); }
  };

  const toggleCc = (on: boolean) => {
    setCcOn(on);
    if (on) {
      setRecipDrafts(prev => {
        const existing = new Set(prev.map(r => r.recipient_email.toLowerCase()));
        const adds = ccList
          .filter(c => c.email && !existing.has(c.email.toLowerCase()))
          .map(c => ({ recipient_email: c.email, recipient_name: c.name, recipient_group: 'Ban lãnh đạo', kind: 'cc' }));
        return [...prev, ...adds];
      });
      if (ccList.length > 0) message.success(`Đã thêm cụm Cc (${ccList.length} người)`);
      else message.warning('Danh bạ Cc đang trống — thêm trong popup Danh bạ');
    } else {
      setRecipDrafts(prev => prev.filter(r => r.kind !== 'cc'));
      message.info('Đã gỡ cụm Cc khỏi người nhận');
    }
  };

  // Chia tags người nhận: cụm To (Giảng viên / Lớp / Khác) + cụm Cc
  const ccDrafts = recipDrafts.filter(r => r.kind === 'cc');
  const toDrafts = recipDrafts.filter(r => r.kind !== 'cc');
  const gvDrafts = toDrafts.filter(r => r.recipient_group === 'GV');
  const lopDrafts = toDrafts.filter(r => r.recipient_group === 'Lớp');
  const otherDrafts = toDrafts.filter(r => r.recipient_group !== 'GV' && r.recipient_group !== 'Lớp');

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Đang tải công việc..." /></div>;
  }

  // Danh sách SV hiển thị ở khối phân công: lọc theo lớp đã chọn + ô tìm kiếm
  const keyword = assignSearch.trim().toLowerCase();
  const visibleStudents = allStudents.filter(s => {
    if (assignClasses.length > 0 && !assignClasses.includes(s.ClassStudentID)) return false;
    if (!keyword) return true;
    const name = `${s.FirstName} ${s.LastName}`.toLowerCase();
    return s.StudentID.toLowerCase().includes(keyword) || name.includes(keyword);
  });

  return (
    <div>
      {/* Sticky header: luôn thấy nút hành động dù cuộn xuống khối nào */}
      <Card
        size="small"
        className="tc-card"
        style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 12 }}
        styles={{ body: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' } }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={back}>Danh sách</Button>
        <strong style={{ flex: 1, fontSize: 16 }}>{editingId ? 'Sửa công việc' : 'Soạn công việc mới'}</strong>
        <Tag color={currentStatus === 'Đã gửi' ? 'cyan' : 'default'}>{currentStatus}</Tag>
        <Button icon={<SaveOutlined />} loading={saving} onClick={handleSaveDraft}>Lưu nháp</Button>
        <Button type="primary" icon={<SendOutlined />} loading={saving} onClick={handleSend}>Gửi</Button>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={{ source: 'Thủ công', task_type: 'ThongBaoDon', priority: 'Bình thường', remind_before_days: 0 }}
      >
        <div className="tc-grid">
          {/* Cột trái: Nguồn & Loại công việc */}
          <div className="tc-source">
            <Card size="small" className="tc-card" title="Nguồn & Loại">
              <div className="tc-source-fields">
                <Form.Item name="source" label="Nguồn công việc">
                  <Select onChange={(v) => setSourceWatch(v)} options={[
                    { value: 'Thủ công', label: 'Tạo thủ công' },
                    { value: 'E-Office', label: 'Từ văn bản eOffice' },
                    { value: 'OCR PDF', label: 'Trích xuất AI (OCR)' },
                  ]} />
                </Form.Item>
                <Form.Item name="task_type" label="Loại công việc" style={{ marginBottom: 0 }}>
                  <Select
                    onChange={(v) => { setTaskTypeWatch(v); if (v === 'ChienDichPhanCong') setAssignOpen(true); }}
                    options={TASK_TYPE_OPTIONS}
                  />
                </Form.Item>
              </div>

              {sourceWatch === 'E-Office' && (
                <Card size="small" style={{ marginTop: 12, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }} title="Tham chiếu eOffice">
                  <Form.Item name="ref_doc_number" label="Số đến/đi" style={{ marginBottom: 8 }}>
                    <Input placeholder="VD: 1575/KH-ĐHĐL" />
                  </Form.Item>
                  <Form.Item name="ref_issue_date" label="Ngày ban hành" style={{ marginBottom: 8 }}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                  <Button size="small" block onClick={suggestContent}>Gợi ý nội dung email</Button>
                </Card>
              )}
            </Card>
          </div>

          {/* Cột giữa: luồng soạn chính — Tiêu đề → Nội dung → Người nhận */}
          <div className="tc-main">
            <Card size="small" className="tc-card" title="Nội dung email">
              <Form.Item name="title" label="Tiêu đề (Subject)" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                <Input size="large" placeholder="VD: Huy động SV dự Lễ khai giảng HK1 2026-2027" />
              </Form.Item>
              <Form.Item name="content" noStyle>
                <EmailEditor />
              </Form.Item>
            </Card>

            <Card size="small" className="tc-card" title="Người nhận">
              <Space style={{ marginBottom: 8 }} wrap>
                <Button size="small" onClick={addAllGvAndClasses}>+ Tất cả GV + Lớp</Button>
                <Button size="small" onClick={addGvOnly}>+ GV</Button>
                <Button size="small" onClick={addLopOnly}>+ Lớp</Button>
                <Button size="small" type={ccOn ? 'primary' : 'default'} onClick={() => toggleCc(!ccOn)}>
                  {ccOn ? '✓ CC' : 'CC'}
                </Button>
                <Button size="small" onClick={() => setDirectoryOpen(true)}>Danh bạ</Button>
                <Select
                  size="small"
                  style={{ width: 260 }}
                  placeholder="Thêm GVCN của lớp..."
                  options={classes.map(c => ({ value: c.class_code, label: `${c.class_code}${c.teacher_name ? ` — ${c.teacher_name}` : ' (chưa gán GVCN)'}` }))}
                  onChange={(v: string) => addGvcnOfClass(v)}
                  value={undefined}
                />
                {recipDrafts.length > 0 && (
                  <Button size="small" danger onClick={() => { setRecipDrafts([]); message.info('Đã xóa hết người nhận'); }}>
                    Xóa hết
                  </Button>
                )}
              </Space>
              <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                <Input placeholder="Email người nhận" value={recipEmail} onChange={e => setRecipEmail(e.target.value)} />
                <Input placeholder="Tên (tùy chọn)" value={recipName} onChange={e => setRecipName(e.target.value)} />
                <Button type="dashed" onClick={addDraftRecipient}>Thêm</Button>
              </Space.Compact>
              {/* 4 khối chỉ hiện khi có người — mới mở trang thì gọn, thêm vào tự bung và ở luôn */}
              {gvDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Giảng viên ({gvDrafts.length})</div>
                  <div style={{ marginBottom: 8 }}>{gvDrafts.map(recipTag)}</div>
                </>
              )}
              {lopDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Lớp ({lopDrafts.length})</div>
                  <div style={{ marginBottom: 8 }}>{lopDrafts.map(recipTag)}</div>
                </>
              )}
              {otherDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Khác ({otherDrafts.length})</div>
                  <div style={{ marginBottom: 4 }}>{otherDrafts.map(recipTag)}</div>
                </>
              )}
              {ccDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#722ed1', marginBottom: 4 }}>Cc — Ban lãnh đạo ({ccDrafts.length})</div>
                  <div style={{ marginBottom: 4 }}>{ccDrafts.map(recipTag)}</div>
                </>
              )}
              {recipDrafts.length === 0 && <span style={{ color: '#999', fontSize: 12 }}>Chưa có người nhận — bấm nút preset hoặc nhập tay để thêm</span>}

              {taskTypeWatch === 'ChienDichPhanCong' && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="warning"
                  showIcon
                  message="Chiến dịch phân công: chọn sinh viên ở khối bên dưới, theo dõi điểm danh ở trang chi tiết"
                />
              )}
            </Card>

            {/* Khối 5: Phân công sinh viên (Gói 4, không bắt buộc, collapsible) */}
            <Card
              size="small"
              className="tc-card"
              title="Phân công sinh viên (không bắt buộc)"
              extra={<Button size="small" onClick={() => setAssignOpen(v => !v)}>{assignOpen ? 'Thu gọn' : 'Mở rộng'}</Button>}
            >
              {assignOpen && (
                <>
                  <Space style={{ display: 'flex', gap: 8, marginBottom: 8 }} wrap>
                    <Select
                      mode="multiple"
                      style={{ minWidth: 280, flex: 1 }}
                      placeholder="Chọn lớp cần huy động..."
                      options={classes.map(c => ({ value: c.class_code, label: c.class_code }))}
                      value={assignClasses}
                      onChange={(v: string[]) => setAssignClasses(v)}
                    />
                    <Input
                      style={{ width: 220 }}
                      placeholder="Tìm theo MSSV / tên..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                      allowClear
                    />
                  </Space>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <strong>Đã chọn: {selectedStudents.length} sinh viên</strong>
                    <Button size="small" disabled={selectedStudents.length === 0} onClick={() => setSelectedModal(true)}>
                      Xem danh sách đã chọn
                    </Button>
                    {selectedStudents.length > 0 && (
                      <Button size="small" type="link" danger onClick={() => setSelectedStudents([])}>Bỏ chọn hết</Button>
                    )}
                  </div>
                  <Table
                    size="small"
                    rowKey="StudentID"
                    pagination={false}
                    scroll={{ y: 320 }}
                    locale={{ emptyText: assignClasses.length === 0 ? 'Chọn ít nhất 1 lớp để thấy danh sách sinh viên' : 'Không tìm thấy sinh viên' }}
                    rowSelection={{
                      selectedRowKeys: selectedStudents,
                      onChange: (keys) => setSelectedStudents(keys as string[]),
                    }}
                    columns={[
                      { title: 'MSSV', dataIndex: 'StudentID', width: 110 },
                      { title: 'Họ tên', render: (_: unknown, r: StudentRow) => `${r.FirstName} ${r.LastName}` },
                      { title: 'Lớp', dataIndex: 'ClassStudentID', width: 90 },
                      {
                        title: 'Vai trò', width: 110,
                        render: (_: unknown, r: StudentRow) => (r.ClassRoleID === 1 ? <Tag color="gold">Lớp trưởng</Tag> : <Tag>SV</Tag>),
                      },
                    ]}
                    dataSource={visibleStudents}
                  />
                </>
              )}
            </Card>
          </div>

          {/* Cột phải sticky: Thiết lập + File */}
          <div className="tc-side">
            <Card size="small" className="tc-card" title="Thiết lập">
              <Form.Item name="semester" label="Học kỳ" rules={[{ required: true, message: 'Chọn học kỳ' }]}>
                <Select placeholder="VD: HK1 2026-2027" options={[
                  { value: 'HK1 2025-2026', label: 'HK1 2025-2026' },
                  { value: 'HK2 2025-2026', label: 'HK2 2025-2026' },
                  { value: 'HK1 2026-2027', label: 'HK1 2026-2027' },
                ]} />
              </Form.Item>
              <Form.Item name="deadline" label="Deadline" rules={[{ required: true, message: 'Chọn deadline' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="remind_before_days" label="Nhắc trước hạn (ngày)" style={{ marginBottom: 12 }}>
                <InputNumber min={0} max={30} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="priority" label="Ưu tiên" style={{ marginBottom: 12 }}>
                <Select options={[{ value: 'Cao', label: 'Cao' }, { value: 'Bình thường', label: 'Bình thường' }, { value: 'Thấp', label: 'Thấp' }]} />
              </Form.Item>
              <Form.Item name="status" label="Trạng thái (tự động khi Gửi)" style={{ marginBottom: 0 }}>
                <Select options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} onChange={(v) => setCurrentStatus(v)} />
              </Form.Item>
            </Card>

            <Card size="small" className="tc-card" title="Tài liệu đính kèm">
              <Form.Item name="drive_link" label="Link Google Sheets / Docs">
                <Input prefix={<LinkOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Dán link..." />
              </Form.Item>
              <Form.Item label="File đính kèm (PDF, Word, Excel...)" style={{ marginBottom: 0 }}>
                <Dragger
                  name="file"
                  multiple={true}
                  fileList={fileList}
                  onRemove={(file) => { setFileList(prev => prev.filter(f => f.uid !== file.uid)); }}
                  beforeUpload={(file) => { setFileList(prev => [...prev, file]); return false; }}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Nhấp hoặc kéo thả file vào đây</p>
                </Dragger>
              </Form.Item>
            </Card>
          </div>
        </div>
      </Form>

      {/* Modal xem nhanh SV đã chọn (bấm × để bỏ chọn mà không cần tìm lại) */}
      <Modal
        title={`Đã chọn ${selectedStudents.length} sinh viên`}
        open={selectedModal}
        onCancel={() => setSelectedModal(false)}
        footer={[<Button key="close" onClick={() => setSelectedModal(false)}>Đóng</Button>]}
      >
        {selectedStudents.map(sid => {
          const s = allStudents.find(x => x.StudentID === sid);
          const label = s ? `${s.FirstName} ${s.LastName} (${sid} — ${s.ClassStudentID})` : sid;
          return (
            <Tag
              key={sid}
              closable
              onClose={() => setSelectedStudents(prev => prev.filter(x => x !== sid))}
              style={{ marginBottom: 4 }}
            >
              {label}
            </Tag>
          );
        })}
      </Modal>

      {/* Popup Danh bạ: GV + Lớp + Cc, sửa thẳng vào DB */}
      <DirectoryModal
        open={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        teachers={teachers}
        classes={classes.map(c => ({ class_code: c.class_code, email: c.email }))}
        ccList={ccList}
        usingFallback={usingFallback}
        onAddTeacher={dirAddTeacher}
        onUpdateTeacher={dirUpdateTeacher}
        onDeleteTeacher={dirDeleteTeacher}
        onAddClass={dirAddClass}
        onUpdateClassEmail={dirUpdateClassEmail}
        onDeleteClass={dirDeleteClass}
        onAddCc={dirAddCc}
        onUpdateCc={dirUpdateCc}
        onDeleteCc={dirDeleteCc}
      />
    </div>
  );
};

export default TaskCompose;
