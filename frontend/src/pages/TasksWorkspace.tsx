import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Tag, Modal, message } from 'antd';
import { EditOutlined, FileAddOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import Tasks from './Tasks';
import TaskCompose from './TaskCompose';
import type { TaskComposeHandle } from './TaskCompose';
import { getTask } from '../services/api';
import type { Task } from '../types';

interface ComposeTab {
  key: string;
  kind: 'new' | 'edit';
  taskId?: number;
  title: string;
  dirty: boolean;
}

const MAX_TABS = 8;

// Bảng danh sách memo: gõ chữ ở tab soạn không dựng lại bảng
const MemoTasks = memo(Tasks);

// Workspace mục Công việc (Gói 2c/2d): thanh tab [Danh sách] + các tab soạn/sửa.
// Tab không active vẫn mount ngầm (ẩn CSS) nên nội dung đang soạn không mất.
// Gói 2d: workspace mount thường trực ở App (ẩn khi sang mục khác) nên chuyển
// mục không mất tab; prop active để tải lại danh sách mỗi khi quay về.
const TasksWorkspace: React.FC<{ active: boolean }> = ({ active }) => {
  const [tabs, setTabs] = useState<ComposeTab[]>([]);
  const [activeKey, setActiveKey] = useState<string>('list');
  const [listRefresh, setListRefresh] = useState(0);

  // Quay lại mục Công việc → tải lại bảng (bỏ qua lần mount đầu)
  const firstActive = useRef(true);
  useEffect(() => {
    if (!active) return;
    if (firstActive.current) { firstActive.current = false; return; }
    setListRefresh(v => v + 1);
  }, [active]);

  // Ref mirror để callbacks ổn định (useCallback rỗng) mà vẫn đọc tabs mới nhất
  const tabsRef = useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; });

  // Ref tới từng tab soạn để gọi auto-save khi rời mục
  const tabRefs = useRef(new Map<string, TaskComposeHandle>());
  const setTabRef = (key: string) => (h: TaskComposeHandle | null) => {
    if (h) tabRefs.current.set(key, h);
    else tabRefs.current.delete(key);
  };

  // Rời mục Công việc → tự Lưu nháp các tab dở (đúng luật dirty), thiếu field thì bỏ qua + báo
  const prevActive = useRef(active);
  useEffect(() => {
    const wasActive = prevActive.current;
    prevActive.current = active;
    if (!wasActive || active) return;
    (async () => {
      const saved: string[] = [];
      const skipped: string[] = [];
      let lastConvertedKey: string | null = null;
      for (const t of tabsRef.current) {
        const h = tabRefs.current.get(t.key);
        if (!h) continue;
        let r;
        try {
          r = await h.autoSave();
        } catch { continue; }
        if (r.saved && r.taskId) {
          saved.push(`'${r.title}'`);
          // Tab new lưu xong thành edit (kẻo lần sau đẻ task mới) — mở lại từ DB cho sạch snapshot
          if (t.kind === 'new') {
            const newKey = `edit-${r.taskId}`;
            setTabs(prevTabs => {
              const without = prevTabs.filter(x => x.key !== t.key && x.key !== newKey);
              return [...without, { key: newKey, kind: 'edit', taskId: r.taskId as number, title: r.title, dirty: false }];
            });
            lastConvertedKey = newKey;
          }
        } else if (r.skipped) {
          skipped.push(`'${r.title}': ${r.skipped}`);
        }
      }
      if (lastConvertedKey) setActiveKey(lastConvertedKey);
      if (saved.length > 0) message.success(`Đã tự lưu nháp ${saved.length} việc: ${saved.join(', ')}`);
      if (skipped.length > 0) message.warning(`Chưa lưu được: ${skipped.join('; ')}`);
    })();
  }, [active]);

  const patchTab = (key: string, patch: Partial<ComposeTab>) => {
    setTabs(prev => {
      const i = prev.findIndex(t => t.key === key);
      if (i < 0) return prev;
      if (Object.entries(patch).every(([k, v]) => prev[i][k as keyof ComposeTab] === v)) return prev;
      const copy = [...prev];
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  };

  const openNew = useCallback(() => {
    if (tabsRef.current.length >= MAX_TABS) { message.warning(`Đang mở tối đa ${MAX_TABS} tab soạn — đóng bớt trước khi mở thêm`); return; }
    const key = `new-${Date.now()}`;
    setTabs(prev => [...prev, { key, kind: 'new', title: '', dirty: false }]);
    setActiveKey(key);
  }, []);

  const openEdit = useCallback((task: Task) => {
    const key = `edit-${task.id}`;
    if (tabsRef.current.some(t => t.key === key)) { setActiveKey(key); return; } // đã mở rồi → nhảy tới
    if (tabsRef.current.length >= MAX_TABS) { message.warning(`Đang mở tối đa ${MAX_TABS} tab soạn — đóng bớt trước khi mở thêm`); return; }
    setTabs(prev => [...prev, { key, kind: 'edit', taskId: task.id, title: task.title || '', dirty: false }]);
    setActiveKey(key);
  }, []);

  // Mọi đường mở soạn (eOffice, deep-link) đều dồn về tab workspace để giữ nháp.
  // Gửi kèm location.state {openNew} hoặc {openEditTaskId}, đọc 1 lần rồi xóa.
  const location = useLocation();
  const navigate = useNavigate();
  const consumedState = useRef<unknown>(null);
  useEffect(() => {
    if (!active) return;
    const s = location.state as { openNew?: boolean; openEditTaskId?: number } | null;
    if (!s || consumedState.current === s) return;
    consumedState.current = s;
    if (s.openEditTaskId) {
      getTask(s.openEditTaskId)
        .then(res => { if (res.success) openEdit(res.data); })
        .catch(() => { message.error('Không mở được công việc'); });
    } else if (s.openNew) {
      openNew();
    }
    navigate('/cong-viec', { replace: true, state: null });
  }, [active, location, navigate, openEdit, openNew]);

  const removeTab = (key: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.key !== key);
      setActiveKey(cur => (cur === key ? 'list' : cur));
      return next;
    });
  };

  const requestClose = (key: string) => {
    const tab = tabs.find(t => t.key === key);
    if (!tab) return;
    if (!tab.dirty) { removeTab(key); return; }
    Modal.confirm({
      title: 'Đóng tab này?',
      content: 'Nội dung đang soạn sẽ bị mất.',
      okText: 'Đóng',
      cancelText: 'Ở lại',
      okButtonProps: { danger: true },
      onOk: () => removeTab(key),
    });
  };

  // Lưu/Gửi xong: đóng tab, về danh sách, tải lại bảng
  const handleDone = (key: string) => {
    removeTab(key);
    setListRefresh(v => v + 1);
  };

  const tabLabel = (t: ComposeTab) =>
    (t.title.trim() || (t.kind === 'new' ? 'Soạn mới' : 'Sửa công việc')).slice(0, 24);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginRight: 'auto' }}>Quản lý Công việc & Sự kiện</h2>
        <Tag
          onClick={() => setActiveKey('list')}
          color={activeKey === 'list' ? 'green' : 'default'}
          style={{ cursor: 'pointer', padding: '5px 12px', fontSize: 13, marginRight: 0 }}
        >
          Danh sách
        </Tag>
        {tabs.map(t => (
          <Tag
            key={t.key}
            closable
            onClose={(e) => { e.preventDefault(); requestClose(t.key); }}
            onClick={() => setActiveKey(t.key)}
            icon={t.kind === 'new' ? <FileAddOutlined /> : <EditOutlined />}
            color={activeKey === t.key ? 'blue' : 'default'}
            style={{ cursor: 'pointer', padding: '5px 8px 5px 12px', fontSize: 13, marginRight: 0 }}
          >
            {tabLabel(t)}{t.dirty ? ' •' : ''}
          </Tag>
        ))}
      </div>

      <div style={{ display: activeKey === 'list' ? 'block' : 'none' }}>
        <MemoTasks onNew={openNew} onEdit={openEdit} refreshToken={listRefresh} />
      </div>

      {tabs.map(t => (
        <div key={t.key} style={{ display: activeKey === t.key ? 'block' : 'none' }}>
          <TaskCompose
            ref={setTabRef(t.key)}
            taskId={t.kind === 'edit' ? t.taskId ?? null : null}
            onTitleChange={(title) => patchTab(t.key, { title })}
            onDirtyChange={(dirty) => patchTab(t.key, { dirty })}
            onDone={() => handleDone(t.key)}
            onBack={() => setActiveKey('list')}
          />
        </div>
      ))}
    </div>
  );
};

export default TasksWorkspace;
