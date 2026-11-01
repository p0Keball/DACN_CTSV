import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Button, Space, Card, Form, Input, InputNumber, Select, DatePicker, message, notification, Tag, Upload, Alert, Spin, Table, Modal, Checkbox } from 'antd';
import { SendOutlined, SaveOutlined, ArrowLeftOutlined, InboxOutlined, LinkOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTask, getStudents, addTask, updateTask, addTaskAttachmentLink, uploadTaskFiles,
  getTaskRecipients, addTaskRecipient, deleteRecipient, sendTaskEmail, getClasses, getTeachers,
  getTaskParticipants, addTaskParticipants, deleteParticipant,
  getTaskAttachments, deleteAttachment, draftEmailFromFiles,
  addTeacher, updateTeacher, clearTeacherEmail, addClass, updateClass, clearClassEmail,
  getCcContacts, addCcContact, updateCcContact, deleteCcContact,
} from '../services/api';
import { TASK_TYPE_OPTIONS } from '../types';
import type { Recipient, Attachment } from '../types';
import EmailEditor from '../components/EmailEditor';
import DirectoryModal, { type DirEntry } from '../components/DirectoryModal';
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

export interface AutoSaveResult {
  saved: boolean;
  skipped?: string;
  taskId?: number;
  title: string;
}

export interface TaskComposeHandle {
  /** Tab cha gọi khi rời mục: tự Lưu nháp nếu dở, thiếu field thì bỏ qua + lý do */
  autoSave: () => Promise<AutoSaveResult>;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Tiêu đề',
  deadline: 'Deadline',
  semester: 'Học kỳ',
  content: 'Nội dung',
};

// Lưu nháp/auto-save không bắt buộc Tiêu đề — dùng tên mặc định thay vì chặn lưu
const DEFAULT_TITLE = 'Không có tiêu đề';

// Bóc text từ HTML editor để kiểm tra "có nội dung thật không" (<p></p> tính là trống)
const stripHtmlText = (s: string) =>
  s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const sameStringSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every(x => sb.has(x));
};

// Lấy message THẬT backend trả (vd "Chưa cấu hình SMTP...") thay vì
// "Request failed with status code 502" mặc định của axios.
const apiErrorMessage = (e: unknown, fallback: string) => {
  const resp = (e as { response?: { data?: { message?: string } } })?.response?.data;
  return resp?.message || (e as Error)?.message || fallback;
};

// Chuẩn hóa 1 task/form về cùng shape để so sánh "có thay đổi gì không"
const snapForm = (t: {
  title?: unknown; content?: unknown; deadline?: unknown; semester?: unknown;
  priority?: unknown; source?: unknown; task_type?: unknown;
  ref_doc_number?: unknown; ref_issue_date?: unknown; remind_before_days?: unknown;
}) => ({
  title: String(t.title || ''),
  content: String(t.content || ''),
  deadline: t.deadline ? dayjs(t.deadline as string | Date).toISOString() : null,
  semester: t.semester || null,
  priority: t.priority || null,
  source: t.source || null,
  task_type: t.task_type || null,
  ref_doc_number: t.ref_doc_number || null,
  ref_issue_date: t.ref_issue_date ? dayjs(t.ref_issue_date as string | Date).format('YYYY-MM-DD') : null,
  remind_before_days: t.remind_before_days ?? null,
});

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

const TaskCompose = forwardRef<TaskComposeHandle, TaskComposeProps>((props, ref) => {
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
  // Trạng thái của task đang sửa (null = soạn mới): lưu nháp không được kéo task đã gửi/kết thúc về Nháp
  const loadedStatusRef = useRef<string | null>(null);
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
  // Kèm bảng phân công SV vào nội dung email khi gửi (mặc định bật)
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [form] = Form.useForm();
  const [sourceWatch, setSourceWatch] = useState<string>('Thủ công');
  const [taskTypeWatch, setTaskTypeWatch] = useState<string>('ThongBaoDon');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<Attachment[]>([]);
  // AI soạn từ file (Phase 1): chỉ task đã lưu mới có file trên server
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSelected, setAiSelected] = useState<number[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const openAiModal = () => {
    if (!editingId) { message.info('Lưu nháp trước, rồi mới dùng AI soạn từ file'); return; }
    if (existingFiles.length === 0) { message.warning('Công việc chưa có file nào trên server'); return; }
    setAiSelected(existingFiles.map(f => f.id));
    setAiOpen(true);
  };

  const runAiDraft = async () => {
    if (!editingId || aiSelected.length === 0) { message.warning('Chọn ít nhất 1 file'); return; }
    setAiLoading(true);
    try {
      const res = await draftEmailFromFiles(editingId, aiSelected);
      if (!res.success) throw new Error(res.message || 'AI soạn thất bại');
      const apply = () => {
        form.setFieldsValue({ title: res.data.subject, content: res.data.body });
        setAiOpen(false);
        message.success('AI đã soạn xong — bạn sửa lại rồi gửi');
      };
      const curContent = stripHtmlText(String(form.getFieldValue('content') || ''));
      if (curContent) {
        Modal.confirm({
          title: 'Ghi đè nội dung đã soạn?',
          content: 'AI sẽ thay tiêu đề + nội dung hiện tại bằng bản mới.',
          okText: 'Ghi đè',
          cancelText: 'Giữ lại',
          onOk: apply,
        });
      } else apply();
    } catch (e) {
      // Hiện đúng lý do backend trả (vd file nào bị bỏ qua vì sao) thay vì "status code 400"
      const resp = (e as { response?: { data?: { message?: string; sources?: Array<{ file_name: string; skipped?: string | null }> } } }).response?.data;
      const reasons = (resp?.sources || []).filter(s => s.skipped).map(s => `${s.file_name}: ${s.skipped}`);
      message.error(resp?.message || (e as Error).message || 'AI soạn thất bại', 6);
      if (reasons.length > 0) {
        Modal.info({
          title: 'Vì sao file bị bỏ qua?',
          content: (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          ),
          okText: 'Đã hiểu',
          width: 560,
        });
      }
    } finally { setAiLoading(false); }
  };
  // Debounce tên tab: ô Tiêu đề gõ vẫn mượt, tên tab cập nhật sau 300ms ngừng gõ
  const titleTimer = useRef<number | null>(null);
  useEffect(() => () => { if (titleTimer.current) window.clearTimeout(titleTimer.current); }, []);
  const [recipDrafts, setRecipDrafts] = useState<Recipient[]>([]);
  const [recipEmail, setRecipEmail] = useState('');
  const [recipName, setRecipName] = useState('');
  const [classes, setClasses] = useState<Array<{ class_code: string; class_name: string; teacher_id: number | null; teacher_name: string | null; email?: string | null }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: number; full_name: string; email: string | null }>>([]);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Cụm Cc (ban lãnh đạo): trạng thái nút suy ra từ danh sách người nhận Cc thực tế
  const [ccList, setCcList] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const ccSeeded = useRef(false);
  const ccUserTouched = useRef(false);

  // Khối Phân công SV (Gói 4): state giữ theo MSSV, không mất khi đổi lớp xem
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [assignClasses, setAssignClasses] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState(false);
  const [assignKeyword, setAssignKeyword] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setAssignKeyword(assignSearch.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [assignSearch]);

  useEffect(() => {
    getClasses().then(res => {
      if (res.success) {
        setClasses(res.data);
        // Mặc định hiện SV 1 lớp đầu (nhẹ) thay vì tất cả — muốn hết thì chọn "Tất cả"
        if (res.data.length > 0) setAssignClasses(prev => (prev.length === 0 ? [res.data[0].class_code] : prev));
      }
    }).catch(() => undefined);
    getTeachers().then(res => { if (res.success) setTeachers(res.data); }).catch(() => undefined);
    getStudents().then(res => { if (res.success) setAllStudents(res.data); }).catch(() => undefined);
    getCcContacts().then(res => { if (res.success) setCcList(res.data); }).catch(() => undefined);
  }, []);

  // Đổi task (mở sửa / soạn mới) → cho phép seed Cc lại.
  // Trạng thái nút CC tự suy ra từ task_recipients nên không cần reset state.
  useEffect(() => {
    ccSeeded.current = false;
    ccUserTouched.current = false;
  }, [editingId]);

  // Soạn mới: tự đưa cụm Cc vào 1 lần khi danh bạ đã tải (im lặng, không toast).
  // Người dùng đã bấm tắt trước khi danh bạ tải xong thì không tự thêm lại.
  useEffect(() => {
    if (editingId || ccList.length === 0 || ccSeeded.current || ccUserTouched.current) return;
    ccSeeded.current = true;
    setRecipDrafts(prev => {
      if (prev.some(r => r.kind === 'cc')) return prev;
      const existing = new Set(prev.map(r => r.recipient_email.toLowerCase()));
      const adds = ccList
        .filter(c => c.email && !existing.has(c.email.toLowerCase()))
        .map(c => ({ recipient_email: c.email, recipient_name: c.name, recipient_group: 'Ban lãnh đạo', kind: 'cc' }));
      return [...prev, ...adds];
    });
  }, [editingId, ccList]);

  useEffect(() => {
    if (!editingId) return;
    let isMounted = true;
    (async () => {
      try {
        const [taskRes, recipRes, partRes, attRes] = await Promise.all([getTask(editingId), getTaskRecipients(editingId), getTaskParticipants(editingId), getTaskAttachments(editingId)]);
        if (!isMounted) return;
        const task = taskRes.success ? taskRes.data : null;
        if (!task) { message.error('Không tìm thấy công việc'); stableDone(); return; }
        loadedStatusRef.current = task.status || null;
        form.setFieldsValue({
          ...task,
          deadline: task.deadline ? dayjs(task.deadline) : null,
          ref_issue_date: task.ref_issue_date ? dayjs(task.ref_issue_date) : null,
        });
        setSourceWatch(task.source || 'Thủ công');
        setTaskTypeWatch(task.task_type || 'ThongBaoDon');
        initFormRef.current = snapForm(task);
        onTitleRef.current?.(task.title || '');
        onDirtyRef.current?.(false);
        if (recipRes.success) {
          setRecipDrafts(recipRes.data);
          initRecipsRef.current = recipRes.data.map((r: { recipient_email: string }) => r.recipient_email.toLowerCase());
        }
        if (attRes.success) setExistingFiles(attRes.data);
        if (partRes.success) {
          const ids = partRes.data.map((p: { student_id: string }) => p.student_id);
          setSelectedStudents(ids);
          initSelectedRef.current = [...ids];
          // Bộ lọc lớp lấy theo CHÍNH các lớp của SV đã phân công — không để mặc định
          // "lớp đầu tiên" ẩn đi lựa chọn của SV thuộc lớp khác.
          const assignedClasses = Array.from(new Set<string>(
            (partRes.data as Array<{ class_code?: string | null; ClassStudentID?: string | null }>)
              .map(p => p.class_code || p.ClassStudentID || '')
              .filter(Boolean)
          ));
          if (assignedClasses.length > 0) setAssignClasses(assignedClasses);
          if ((task.task_type || 'ThongBaoDon') === 'ChienDichPhanCong' || ids.length > 0) setAssignOpen(true);
        } else if ((task.task_type || 'ThongBaoDon') === 'ChienDichPhanCong') {
          setAssignOpen(true);
        }
      } catch { message.error('Không tải được công việc'); }
      finally { if (isMounted) setLoading(false); }
      // Chụp lại ảnh form sau khi editor đồng bộ xong: TipTap chuẩn hóa
      // text cũ thành <p>…</p> — chụp ngay lúc load sẽ so lệch và hỏi thừa
      setTimeout(() => {
        if (!isMounted) return;
        initFormRef.current = snapForm(form.getFieldsValue());
        onDirtyRef.current?.(false);
      }, 300);
    })();
    return () => { isMounted = false; };
  }, [editingId, form, navigate, stableDone]);

  const teacherById = (tid: number | null) => teachers.find(t => t.id === tid);

  // Ảnh lúc mở tab Sửa để so "có thay đổi gì không" (rule đóng tab mới)
  const initRecipsRef = useRef<string[]>([]);
  const initSelectedRef = useRef<string[]>([]);
  const initFormRef = useRef<Record<string, unknown> | null>(null);

  // Cụm Cc tự seed khi soạn mới không tính là thay đổi của người dùng.
  // So sánh người nhận hiện tại với danh sách Cc mặc định để biết có thêm/gỡ ai không.
  const autoCcEmails = ccList.filter(c => c.email).map(c => c.email.toLowerCase());
  const recipsDifferFromAutoCc = !sameStringSet(
    recipDrafts.map(r => r.recipient_email.toLowerCase()),
    autoCcEmails
  );

  // Luật hỏi xác nhận khi đóng tab: soạn mới = có chữ ở tiêu đề/nội dung,
  // có file/SV hoặc người nhận khác cụm Cc mặc định;
  // sửa = form khác lúc mở, hoặc người nhận/file/SV khác lúc mở.
  const computeConfirmNeeded = () => {
    const titleTxt = String(form.getFieldValue('title') || '').trim();
    const bodyTxt = stripHtmlText(String(form.getFieldValue('content') || ''));
    if (!editingId) {
      return titleTxt !== ''
        || bodyTxt !== ''
        || fileList.length > 0
        || selectedStudents.length > 0
        || recipsDifferFromAutoCc;
    }
    const init = initFormRef.current;
    const formDiffers = !init || JSON.stringify(snapForm(form.getFieldsValue())) !== JSON.stringify(init);
    const curRecips = recipDrafts.map(r => r.recipient_email.toLowerCase());
    const curSel = [...selectedStudents];
    return formDiffers
      || !sameStringSet(curRecips, initRecipsRef.current)
      || !sameStringSet(curSel, initSelectedRef.current)
      || fileList.length > 0;
  };

  // Báo về tab cha có cần hỏi xác nhận khi đóng tab không (parent tự chặn set trùng)
  useEffect(() => {
    const titleTxt = String(form.getFieldValue('title') || '').trim();
    const bodyTxt = stripHtmlText(String(form.getFieldValue('content') || ''));
    let needed: boolean;
    if (!editingId) {
      needed = titleTxt !== ''
        || bodyTxt !== ''
        || fileList.length > 0
        || selectedStudents.length > 0
        || recipsDifferFromAutoCc;
    } else {
      const init = initFormRef.current;
      needed = !init
        || JSON.stringify(snapForm(form.getFieldsValue())) !== JSON.stringify(init)
        || !sameStringSet(recipDrafts.map(r => r.recipient_email.toLowerCase()), initRecipsRef.current)
        || !sameStringSet([...selectedStudents], initSelectedRef.current)
        || fileList.length > 0;
    }
    onDirtyRef.current?.(needed);
  }, [editingId, recipDrafts, fileList, selectedStudents, form, ccList]);

  const handleFormChange = (changed: Record<string, unknown>) => {
    onDirtyRef.current?.(computeConfirmNeeded());
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
    ? teachers.filter(t => t.email).map(t => ({ name: t.full_name, email: t.email as string }))
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

  // Gỡ khỏi danh bạ: GV/Lớp chỉ xoá hòm thư (giữ GVCN, lớp, sinh viên); Cc xoá hẳn liên hệ
  const removeDirEntries = async (entries: DirEntry[]) => {
    const teacherIds = entries.filter(e => e.type === 'teacher').map(e => e.id as number);
    const codes = entries.filter(e => e.type === 'class').map(e => e.code as string);
    const ccIds = entries.filter(e => e.type === 'cc').map(e => e.id as number);
    const removedCcEmails = ccList.filter(c => ccIds.includes(c.id)).map(c => c.email.toLowerCase());
    const settle = (p: Promise<{ success?: boolean }>) => p.catch(() => ({ success: false }));
    const results = await Promise.all([
      ...teacherIds.map(id => settle(clearTeacherEmail(id))),
      ...codes.map(code => settle(clearClassEmail(code))),
      ...ccIds.map(id => settle(deleteCcContact(id))),
    ]);
    const ok = results.filter(r => r.success).length;
    if (teacherIds.length) setTeachers(prev => prev.map(t => (teacherIds.includes(t.id) ? { ...t, email: null } : t)));
    if (codes.length) setClasses(prev => prev.map(c => (codes.includes(c.class_code) ? { ...c, email: null } : c)));
    if (ccIds.length) {
      setCcList(prev => prev.filter(c => !ccIds.includes(c.id)));
      // Gỡ luôn khỏi danh sách đang soạn (nếu có)
      setRecipDrafts(prev => prev.filter(r => !(r.kind === 'cc' && removedCcEmails.includes(r.recipient_email.toLowerCase()))));
    }
    if (ok === entries.length) message.success(`Đã gỡ ${ok} mục khỏi danh bạ`);
    else if (ok > 0) message.warning(`Chỉ gỡ được ${ok}/${entries.length} mục`);
    else message.error('Không gỡ được mục nào');
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
    const tEmail = t?.email;
    if (!t || !tEmail) { message.warning('GVCN chưa có email'); return; }
    if (recipDrafts.some(r => r.recipient_email.toLowerCase() === tEmail.toLowerCase())) {
      message.warning('Đã có trong danh sách'); return;
    }
    setRecipDrafts(prev => [...prev, { recipient_email: tEmail, recipient_name: `${t.full_name} (GVCN ${classCode})`, recipient_group: 'GVCN' }]);
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

  const handleDeleteExistingFile = async (id: number) => {
    const res = await deleteAttachment(id);
    if (res.success) {
      message.success('Đã xóa file');
      setExistingFiles(prev => prev.filter(f => f.id !== id));
      onDirtyRef.current?.(true); // xóa file là thay đổi (dù đã lưu ngay)
    } else message.error('Lỗi khi xóa file');
  };

  // Task mới đã tạo nhưng bước sau lỗi (upload file / SMTP / đồng bộ người nhận)
  // → các lần lưu/gửi lại phải cập nhật chính task đó, không gọi addTask lần 2.
  const createdTaskIdRef = useRef<number | null>(null);

  // persistTask: lưu task + recipients + attachments, trả về taskId.
  // lenient (auto-save): bỏ validate nghiêm, chỉ bắt buộc Tiêu đề (DB NOT NULL);
  // Deadline/Học kỳ được null — quay lại điền sau.
  const persistTask = async (status: string, opts?: { lenient?: boolean }): Promise<number> => {
    let values: Record<string, unknown>;
    if (opts?.lenient) {
      values = form.getFieldsValue();
      if (!String(values.title || '').trim()) {
        values.title = DEFAULT_TITLE;
        form.setFieldsValue({ title: DEFAULT_TITLE });
        onTitleRef.current?.(DEFAULT_TITLE);
      }
    } else {
      values = await form.validateFields();
    }
    const deadlineValue = values.deadline as unknown as { toISOString: () => string } | null;
    const refDateValue = values.ref_issue_date as unknown as { toISOString?: () => string } | null;
    // Tiêu đề tối đa 1 xuống dòng + vừa cột VARCHAR(255) của DB
    const cleanTitle = String(values.title || '').split('\n').slice(0, 2).join('\n').slice(0, 255);
    const payload = {
      ...values,
      title: cleanTitle,
      deadline: deadlineValue ? (deadlineValue as unknown as { toISOString: () => string }).toISOString() : null,
      ref_issue_date: refDateValue ? dayjs((refDateValue as unknown as { toISOString?: () => string }).toISOString ? (refDateValue as unknown as { toISOString: () => string }).toISOString() : undefined).format('YYYY-MM-DD') : (values.ref_issue_date ? dayjs(values.ref_issue_date as string).format('YYYY-MM-DD') : null),
      status,
    };
    delete (payload as Record<string, unknown>).drive_link;

    // Nếu task mới đã được tạo ở lần trước (dù bước sau lỗi) thì lần này chỉ cập nhật.
    const existingTaskId = editingId || createdTaskIdRef.current;
    const taskRes = existingTaskId ? await updateTask(existingTaskId, payload) : await addTask(payload);
    if (!taskRes.success) throw new Error('Lỗi khi lưu công việc');
    const taskId: number = existingTaskId || taskRes.data.id;
    if (!existingTaskId) createdTaskIdRef.current = taskId;
    const isExistingTask = Boolean(existingTaskId);

    // Đồng bộ recipients: lấy danh sách cũ, xóa cái bị gỡ, thêm cái mới.
    // Task vừa tạo ở lần trước cũng phải đi nhánh sync để tránh nhân đôi người nhận.
    if (isExistingTask) {
      const oldRes = await getTaskRecipients(taskId);
      if (!oldRes.success) throw new Error('Không tải được người nhận cũ để đồng bộ');
      const oldList: Array<{ id: number; recipient_email: string }> = oldRes.data;
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

    // Link Drive: chỉ thêm nếu chưa có, và xoá ô nhập sau khi lưu để lần save sau
    // (auto-save/retry) không chèn thêm một dòng link trùng.
    const driveLink = String(values.drive_link || '').trim();
    if (driveLink) {
      const alreadyLinked = existingFiles.some(f => f.file_url === driveLink);
      if (!alreadyLinked) {
        const linkRes = await addTaskAttachmentLink(taskId, driveLink);
        if (!linkRes?.success) throw new Error(linkRes?.message || 'Lưu link tài liệu thất bại');
        if (linkRes.data) setExistingFiles(prev => [...prev, linkRes.data]);
      }
      form.setFieldsValue({ drive_link: '' });
    }

    // Đồng bộ phân công SV: thêm mới bulk, gỡ cái bị bỏ chọn (cả task vừa tạo ở lần trước)
    const partRes = await getTaskParticipants(taskId);
    const oldParts: Array<{ id: number; student_id: string }> = partRes.success ? partRes.data : [];
    const oldIds = new Set(oldParts.map(p => p.student_id));
    const newIds = new Set(selectedStudents);
    const toAdd = selectedStudents.filter(sid => !oldIds.has(sid));
    if (toAdd.length > 0) {
      await addTaskParticipants(taskId, toAdd);
    }
    if (isExistingTask) {
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
      const uploadRes = await uploadTaskFiles(taskId, formData);
      if (!uploadRes?.success) throw new Error(uploadRes?.message || 'Tải file đính kèm thất bại');
      // File đã lên server → chuyển sang danh sách file hiện có để không upload lại
      setExistingFiles(prev => [...prev, ...(uploadRes.data || [])]);
      setFileList([]);
    }
    return taskId;
  };

  // Chống lưu chồng (bấm tay đúng lúc auto-save chạy và ngược lại)
  const busyRef = useRef(false);

  // Lưu nháp: task mới → 'Nháp'; task đã gửi/kết thúc giữ nguyên trạng thái
  // (tránh sửa nội dung xong lại làm task rơi khỏi danh sách điểm danh).
  const draftStatus = () =>
    loadedStatusRef.current === 'Đã gửi' || loadedStatusRef.current === 'Kết thúc'
      ? loadedStatusRef.current
      : 'Nháp';

  const handleSaveDraft = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    try {
      // Nháp chỉ cần Tiêu đề; Học kỳ/Deadline để trống, điền sau khi Gửi
      await persistTask(draftStatus(), { lenient: true });
      done();
    } catch (e) {
      // Chỉ thiếu Tiêu đề (DB bắt buộc) → báo ngay tại ô, không hiện toast
      const err = e as { errorFields?: Array<{ name?: (string | number)[] }> };
      if (err.errorFields?.length) {
        form.setFields(err.errorFields.map(f => ({
          name: (f.name || []) as (string | number)[],
          errors: ['Vui lòng nhập tiêu đề'],
        })));
        form.scrollToField('title');
      } else {
        message.error(apiErrorMessage(e, 'Có lỗi khi lưu nháp!'));
      }
    } finally { setSaving(false); busyRef.current = false; }
  };

  const handleSend = async () => {
    if (recipDrafts.length === 0) { message.warning('Hãy thêm ít nhất 1 người nhận trước khi gửi'); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    try {
      const taskId = await persistTask(draftStatus());
      const res = await sendTaskEmail(taskId, 'Gửi lần đầu', includeAssignments);
      if (!res.success) throw new Error(res.message || 'Gửi thất bại');
      const att = res.attachments as { sent?: number; links?: number; skipped?: string[] } | undefined;
      message.success(`Đã gửi email tới ${res.data.length} người nhận${att?.sent ? `, kèm ${att.sent} file` : ''}`);
      if (att?.skipped?.length) message.warning(`Không đính kèm được (file mất trên máy chủ): ${att.skipped.join(', ')}`, 6);
      done();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Có lỗi khi gửi email!'), 6);
    } finally { setSaving(false); busyRef.current = false; }
  };

  // Tab cha gọi khi rời mục: tự Lưu nháp nếu dở (đúng luật dirty), thiếu field thì bỏ qua + lý do
  const autoSave = async (): Promise<AutoSaveResult> => {
    const tabTitle = String(form.getFieldValue('title') || '').trim() || DEFAULT_TITLE;
    if (busyRef.current || saving) return { saved: false, title: tabTitle, skipped: 'đang lưu dở' };
    if (loading) return { saved: false, title: tabTitle, skipped: 'đang tải công việc' };
    if (!computeConfirmNeeded()) return { saved: false, title: tabTitle };
    busyRef.current = true;
    try {
      const taskId = await persistTask(draftStatus(), { lenient: true });
      // Đã lưu → chụp lại ảnh gốc để lần sau không coi là còn thay đổi
      initFormRef.current = snapForm(form.getFieldsValue());
      initRecipsRef.current = recipDrafts.map(r => r.recipient_email.toLowerCase());
      initSelectedRef.current = [...selectedStudents];
      onDirtyRef.current?.(false);
      return { saved: true, title: tabTitle, taskId };
    } catch (e) {
      const fields = (e as { errorFields?: Array<{ name?: (string | number)[] }> })?.errorFields
        ?.map(f => FIELD_LABELS[String(f.name?.[0])] || String(f.name?.[0] ?? ''))
        .filter(Boolean) || [];
      return { saved: false, title: tabTitle, skipped: fields.length > 0 ? `thiếu ${fields.join(', ')}` : 'không lưu được' };
    } finally { busyRef.current = false; }
  };
  useImperativeHandle(ref, () => ({ autoSave }));

  const toggleCc = (on: boolean) => {
    ccUserTouched.current = true;
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
  // Nút CC bật/tắt theo đúng dữ liệu đã lưu: có dòng kind='cc' = bật
  const ccOn = ccDrafts.length > 0;
  // Thu gọn khối To: mỗi khối hiện 3 tags đầu + "+N nữa"; 1 nút bung tất cả. Cc giữ nguyên.
  const COLLAPSED_N = 3;
  const [recipExpanded, setRecipExpanded] = useState(false);
  const renderTags = (list: Recipient[]) => {
    const shown = recipExpanded ? list : list.slice(0, COLLAPSED_N);
    return (
      <>
        {shown.map(recipTag)}
        {!recipExpanded && list.length > COLLAPSED_N && (
          <span style={{ color: '#999', fontSize: 12 }}> +{list.length - COLLAPSED_N} nữa</span>
        )}
      </>
    );
  };
  const toDrafts = recipDrafts.filter(r => r.kind !== 'cc');
  const gvDrafts = toDrafts.filter(r => r.recipient_group === 'GV');
  const lopDrafts = toDrafts.filter(r => r.recipient_group === 'Lớp');
  const otherDrafts = toDrafts.filter(r => r.recipient_group !== 'GV' && r.recipient_group !== 'Lớp');

  // Cụm nút hành động: render ở header trên + cột trái sticky (cùng hàm, cùng state)
  const actionButtons = (
    <>
      <Button block icon={<SaveOutlined />} loading={saving} onClick={handleSaveDraft}>Lưu nháp</Button>
      <Checkbox checked={includeAssignments} onChange={e => setIncludeAssignments(e.target.checked)} style={{ marginLeft: 0, fontSize: 13 }}>
        Kèm bảng phân công trong email
      </Checkbox>
      <Button block type="primary" icon={<SendOutlined />} loading={saving} onClick={handleSend}>Gửi</Button>
    </>
  );

  // Bảng preview đúng thứ tự email: lớp → tên → MSSV (giống ORDER BY backend)
  const selectedStudentRows: StudentRow[] = useMemo(
    () => selectedStudents
      .map(sid => allStudents.find(s => s.StudentID === sid) || { StudentID: sid, FirstName: '', LastName: '', ClassStudentID: '' })
      .sort((a, b) =>
        (a.ClassStudentID || '').localeCompare(b.ClassStudentID || '') ||
        `${a.FirstName} ${a.LastName}`.localeCompare(`${b.FirstName} ${b.LastName}`, 'vi') ||
        a.StudentID.localeCompare(b.StudentID)
      ),
    [selectedStudents, allStudents]
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" description="Đang tải công việc..." /></div>;
  }

  // Danh sách SV hiển thị ở khối phân công: lọc theo lớp đã chọn + ô tìm kiếm (debounce).
  // Mặc định chỉ 1 lớp đầu (nhẹ); chọn "Tất cả" mới hiện hết.
  const showAllClasses = assignClasses.includes('__ALL__');
  const keyword = assignKeyword;
  const visibleStudents = allStudents.filter(s => {
    if (!showAllClasses) {
      if (assignClasses.length === 0) return false; // bỏ chọn hết lớp = không hiện ai (nhẹ)
      if (!assignClasses.includes(s.ClassStudentID)) return false;
    }
    if (!keyword) return true;
    const name = `${s.FirstName} ${s.LastName}`.toLowerCase();
    return s.StudentID.toLowerCase().includes(keyword) || name.includes(keyword);
  });

  const selectAllVisible = () => {
    setSelectedStudents(prev => {
      const set = new Set(prev);
      visibleStudents.forEach(s => set.add(s.StudentID));
      return [...set];
    });
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={{ source: 'Thủ công', task_type: 'ThongBaoDon', priority: 'Bình thường', remind_before_days: 0, semester: 'HK1 2026-2027' }}
      >
        <div className="tc-grid">
          {/* Cột trái sticky: nút hành động luôn thấy khi cuộn + Nguồn & Loại */}
          <div className="tc-source">
            <Card size="small" className="tc-card" title="Thao tác" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button block icon={<ArrowLeftOutlined />} onClick={back}>Danh sách</Button>
                {actionButtons}
              </div>
            </Card>
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
                <Input.TextArea
                  rows={2}
                  placeholder="VD: Huy động SV dự Lễ khai giảng HK1 2026-2027"
                  style={{ fontSize: 16, fontWeight: 600 }}
                />
              </Form.Item>
              <Form.Item name="content" noStyle>
                <EmailEditor assignmentRows={includeAssignments ? selectedStudentRows : []} />
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
                  <Button size="small" danger onClick={() => { setRecipDrafts([]); message.info('Đã xóa hết người nhận (kể cả Cc)'); }}>
                    Xóa hết
                  </Button>
                )}
              </Space>
              <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                <Input placeholder="Email người nhận" value={recipEmail} onChange={e => setRecipEmail(e.target.value)} />
                <Input placeholder="Tên (tùy chọn)" value={recipName} onChange={e => setRecipName(e.target.value)} />
                <Button type="dashed" onClick={addDraftRecipient}>Thêm</Button>
              </Space.Compact>
              {/* 4 khối chỉ hiện khi có người; khối To gọn 3 tags đầu, 1 nút bung tất cả */}
              {recipDrafts.length > COLLAPSED_N && (
                <Button type="link" size="small" style={{ padding: 0, marginBottom: 4 }} onClick={() => setRecipExpanded(v => !v)}>
                  {recipExpanded ? 'Thu gọn' : `Mở rộng tất cả (${recipDrafts.length})`}
                </Button>
              )}
              {gvDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Giảng viên ({gvDrafts.length})</div>
                  <div style={{ marginBottom: 8 }}>{renderTags(gvDrafts)}</div>
                </>
              )}
              {lopDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Lớp ({lopDrafts.length})</div>
                  <div style={{ marginBottom: 8 }}>{renderTags(lopDrafts)}</div>
                </>
              )}
              {otherDrafts.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Khác ({otherDrafts.length})</div>
                  <div style={{ marginBottom: 4 }}>{renderTags(otherDrafts)}</div>
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
                  title="Chiến dịch phân công: chọn sinh viên ở khối bên dưới, theo dõi điểm danh ở trang chi tiết"
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
                      options={[
                        { value: '__ALL__', label: 'Tất cả sinh viên' },
                        ...classes.map(c => ({ value: c.class_code, label: c.class_code })),
                      ]}
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
                    <Button size="small" disabled={visibleStudents.length === 0} onClick={selectAllVisible}>
                      Chọn tất cả {visibleStudents.length} đang lọc
                    </Button>
                    {selectedStudents.length > 0 && (
                      <Button size="small" type="link" danger onClick={() => setSelectedStudents([])}>Bỏ chọn hết</Button>
                    )}
                  </div>
                  <Table
                    size="small"
                    rowKey="StudentID"
                    pagination={{ pageSize: 30, showSizeChanger: false }}
                    locale={{ emptyText: assignClasses.length === 0 && !showAllClasses ? 'Chọn ít nhất 1 lớp để thấy danh sách sinh viên' : 'Không tìm thấy sinh viên' }}
                    rowSelection={{
                      selectedRowKeys: selectedStudents,
                      // Giữ lựa chọn khi đổi lọc lớp / chuyển trang — SV ngoài view không bị rơi khỏi state
                      preserveSelectedRowKeys: true,
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
                {/* Năm học mới: thêm option vào đúng chỗ này */}
                <Select placeholder="VD: HK1 2026-2027" options={[
                  { value: 'HK1 2026-2027', label: 'HK1 2026-2027' },
                  { value: 'HK2 2026-2027', label: 'HK2 2026-2027' },
                ]} />
              </Form.Item>
              <Form.Item name="deadline" label="Deadline" rules={[{ required: true, message: 'Chọn deadline' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="remind_before_days" label="Nhắc trước hạn (ngày)" style={{ marginBottom: 12 }}>
                <InputNumber min={0} max={30} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="priority" label="Ưu tiên" style={{ marginBottom: 0 }}>
                <Select options={[{ value: 'Cao', label: 'Cao' }, { value: 'Bình thường', label: 'Bình thường' }, { value: 'Thấp', label: 'Thấp' }]} />
              </Form.Item>
            </Card>

            <Card
              size="small"
              className="tc-card"
              title={`Tài liệu đính kèm (${existingFiles.length + fileList.length})`}
              extra={<Button size="small" onClick={openAiModal}>✨ AI soạn từ file</Button>}
            >
              <Form.Item name="drive_link" label="Link Google Sheets / Docs">
                <Input prefix={<LinkOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Dán link..." />
              </Form.Item>
              {/* File đã có của task (upload tay / đồng bộ eOffice): bấm xem ngay, × để xóa */}
              {existingFiles.length > 0 && (
                <div style={{ marginBottom: 8, background: '#fafafa', borderRadius: 6, padding: '4px 8px' }}>
                  {existingFiles.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <FileTextOutlined style={{ color: '#1677ff' }} />
                      <a href={f.file_url} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.file_name}
                      </a>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteExistingFile(f.id)} />
                    </div>
                  ))}
                </div>
              )}
              <Form.Item label="Thêm file (PDF, Word, Excel...)" style={{ marginBottom: 0 }}>
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

      {/* Popup chọn file cho AI soạn (Phase 1) */}
      <Modal
        title="AI soạn email từ file nào?"
        open={aiOpen}
        onCancel={() => setAiOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAiOpen(false)}>Đóng</Button>,
          <Button key="run" type="primary" loading={aiLoading} disabled={aiSelected.length === 0} onClick={runAiDraft}>
            Soạn email
          </Button>,
        ]}
      >
        <Checkbox.Group
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          value={aiSelected}
          onChange={(v) => setAiSelected(v as number[])}
        >
          {existingFiles.map(f => (
            <Checkbox key={f.id} value={f.id}>{f.file_name}</Checkbox>
          ))}
        </Checkbox.Group>
        <div style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
          Đọc PDF chữ / Word / Excel / TXT. PDF scan và ảnh sẽ gửi cho AI đọc trực tiếp (chậm hơn, tốn quota hơn).
        </div>
      </Modal>

      {/* Popup Danh bạ: GV + Lớp + Cc, sửa thẳng vào DB */}
      <DirectoryModal
        open={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        teachers={teachers.filter(t => t.email) as Array<{ id: number; full_name: string; email: string }>}
        classes={classes.filter(c => c.email).map(c => ({ class_code: c.class_code, email: c.email }))}
        ccList={ccList}
        usingFallback={usingFallback}
        onAddRecipients={items => bulkAdd(items, `${items.length} người từ danh bạ`)}
        onRemove={removeDirEntries}
        onAddTeacher={dirAddTeacher}
        onUpdateTeacher={dirUpdateTeacher}
        onAddClass={dirAddClass}
        onUpdateClassEmail={dirUpdateClassEmail}
        onAddCc={dirAddCc}
        onUpdateCc={dirUpdateCc}
      />
    </div>
  );
});

export default TaskCompose;
