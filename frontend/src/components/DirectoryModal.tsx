import React, { useMemo, useState } from 'react';
import { Modal, Input, Button, Space, Tag, Popconfirm, message, Checkbox, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export interface DirTeacher {
  id: number;
  full_name: string;
  email: string;
}

export interface DirClass {
  class_code: string;
  email?: string | null;
}

export interface DirCc {
  id: number;
  name: string;
  email: string;
}

// Một mục trong danh bạ (để gỡ hàng loạt / xoá lẻ)
export interface DirEntry {
  type: 'teacher' | 'class' | 'cc';
  id?: number;
  code?: string;
}

// Một người nhận trả ra khi tick: GV/Lớp → To, Cc → Cc
export interface DirRecipient {
  recipient_email: string;
  recipient_name?: string;
  recipient_group?: string;
  kind?: string;
}

interface DirectoryModalProps {
  open: boolean;
  onClose: () => void;
  teachers: DirTeacher[];
  classes: DirClass[];
  ccList: DirCc[];
  /** true khi DB trống và preset đang rớt về danh sách cứng */
  usingFallback: boolean;
  /** Bấm "Thêm vào người nhận": trả về danh sách đã tick */
  onAddRecipients?: (items: DirRecipient[]) => void;
  /** Gỡ khỏi danh bạ (GV/Lớp chỉ xoá hòm thư, Cc thì xoá hẳn liên hệ) */
  onRemove: (entries: DirEntry[]) => Promise<void> | void;
  onAddTeacher: (name: string, email: string) => Promise<void>;
  onUpdateTeacher: (id: number, patch: { full_name?: string; email?: string }) => Promise<void>;
  onAddClass: (code: string, email: string) => Promise<void>;
  onUpdateClassEmail: (code: string, email: string) => Promise<void>;
  onAddCc: (name: string, email: string) => Promise<void>;
  onUpdateCc: (id: number, patch: { name?: string; email?: string }) => Promise<void>;
}

const validEmail = (s: string) => s.includes('@');

// Một dòng tên + email sửa tại chỗ: commit khi blur/Enter và có thay đổi
const NameEmailRow: React.FC<{
  name: string;
  email: string;
  namePlaceholder: string;
  nameReadOnly?: boolean;
  onSave: (name: string, email: string) => void;
  onDelete: () => void;
  deleteTitle: string;
  deleteDescription?: string;
}> = ({ name: initName, email: initEmail, namePlaceholder, nameReadOnly, onSave, onDelete, deleteTitle, deleteDescription }) => {
  const [name, setName] = useState(initName);
  const [email, setEmail] = useState(initEmail);
  const dirty = name.trim() !== initName || email.trim() !== initEmail;
  const commit = () => {
    if (!dirty) return;
    if (!name.trim() || !validEmail(email.trim())) { message.warning('Tên và email hợp lệ mới lưu được'); return; }
    onSave(name.trim(), email.trim());
  };
  return (
    <Space.Compact style={{ width: '100%', marginBottom: 6, flex: 1 }}>
      {!nameReadOnly && (
        <Input value={name} onChange={e => setName(e.target.value)} onBlur={commit} onPressEnter={commit} placeholder={namePlaceholder} />
      )}
      <Input value={email} onChange={e => setEmail(e.target.value)} onBlur={commit} onPressEnter={commit} placeholder="Email" />
      <Popconfirm title={deleteTitle} description={deleteDescription} onConfirm={onDelete} okButtonProps={{ danger: true }}>
        <Button danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space.Compact>
  );
};

// Một dòng có checkbox chọn (để thêm vào người nhận / gỡ khỏi danh bạ)
const SelectableRow: React.FC<{
  checked: boolean;
  disabled?: boolean;
  lockReason?: string;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ checked, disabled, lockReason, onToggle, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <Tooltip title={disabled ? lockReason : 'Chọn dòng này'}>
      <Checkbox checked={checked} disabled={disabled} onChange={onToggle} />
    </Tooltip>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

// Popup Danh bạ người nhận: đọc/ghi thẳng DB, sửa tại chỗ.
// Tick chọn để thêm vào người nhận (To/Cc) hoặc gỡ khỏi danh bạ (từ 2 dòng trở lên).
const DirectoryModal: React.FC<DirectoryModalProps> = (props) => {
  const { open, onClose, teachers, classes, ccList, usingFallback, onAddRecipients, onRemove } = props;
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newClassEmail, setNewClassEmail] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');

  // Tick chọn: key theo loại (t-/c-/cc-) để không đụng id giữa các bảng
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Bỏ tick sạch khi đóng popup (lần mở sau bắt đầu từ trắng)
  const handleClose = () => { setSelected(new Set()); onClose(); };

  const invalidEmail = (email?: string | null) => !email || !validEmail(email);
  const teacherKeys = teachers.filter(t => !invalidEmail(t.email)).map(t => `t-${t.id}`);
  const classKeys = classes.filter(c => !invalidEmail(c.email)).map(c => `c-${c.class_code}`);
  const ccKeys = ccList.filter(c => !invalidEmail(c.email)).map(c => `cc-${c.id}`);

  const toggle = (key: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const selectAll = (keys: string[]) =>
    setSelected(prev => { const n = new Set(prev); keys.forEach(k => n.add(k)); return n; });
  const clearSection = (keys: string[]) =>
    setSelected(prev => { const n = new Set(prev); keys.forEach(k => n.delete(k)); return n; });
  const allSelected = (keys: string[]) => keys.length > 0 && keys.every(k => selected.has(k));

  // Danh sách mục đang tick (để gỡ khỏi danh bạ)
  const selectedEntries = useMemo<DirEntry[]>(() => {
    const out: DirEntry[] = [];
    teachers.forEach(t => { if (selected.has(`t-${t.id}`)) out.push({ type: 'teacher', id: t.id }); });
    classes.forEach(c => { if (selected.has(`c-${c.class_code}`)) out.push({ type: 'class', code: c.class_code }); });
    ccList.forEach(c => { if (selected.has(`cc-${c.id}`)) out.push({ type: 'cc', id: c.id }); });
    return out;
  }, [selected, teachers, classes, ccList]);

  // Danh sách người nhận trả ra khi bấm "Thêm vào người nhận"
  const selectedItems = useMemo<DirRecipient[]>(() => {
    const out: DirRecipient[] = [];
    teachers.forEach(t => {
      if (selected.has(`t-${t.id}`) && t.email) out.push({ recipient_email: t.email, recipient_name: t.full_name, recipient_group: 'GV', kind: 'to' });
    });
    classes.forEach(c => {
      if (selected.has(`c-${c.class_code}`) && c.email) out.push({ recipient_email: c.email, recipient_name: `Lớp ${c.class_code}`, recipient_group: 'Lớp', kind: 'to' });
    });
    ccList.forEach(c => {
      if (selected.has(`cc-${c.id}`) && c.email) out.push({ recipient_email: c.email, recipient_name: c.name, recipient_group: 'Ban lãnh đạo', kind: 'cc' });
    });
    return out;
  }, [selected, teachers, classes, ccList]);

  const addTeacher = async () => {
    if (!newName.trim() || !validEmail(newEmail.trim())) { message.warning('Nhập tên và email hợp lệ'); return; }
    await props.onAddTeacher(newName.trim(), newEmail.trim());
    setNewName(''); setNewEmail('');
  };

  const addClass = async () => {
    if (!newCode.trim() || !validEmail(newClassEmail.trim())) { message.warning('Nhập mã lớp và hòm thư hợp lệ'); return; }
    await props.onAddClass(newCode.trim().toUpperCase(), newClassEmail.trim());
    setNewCode(''); setNewClassEmail('');
  };

  const addCc = async () => {
    if (!newCcName.trim() || !validEmail(newCcEmail.trim())) { message.warning('Nhập tên và email hợp lệ'); return; }
    await props.onAddCc(newCcName.trim(), newCcEmail.trim());
    setNewCcName(''); setNewCcEmail('');
  };

  const applySelected = () => {
    if (selectedItems.length === 0) return;
    onAddRecipients?.(selectedItems);
    setSelected(new Set());
    handleClose();
  };

  const confirmRemove = () => {
    if (selectedEntries.length < 2) return;
    const entries = selectedEntries;
    const hasClass = entries.some(e => e.type === 'class');
    const hasCc = entries.some(e => e.type === 'cc');
    Modal.confirm({
      title: `Gỡ ${entries.length} mục khỏi danh bạ?`,
      content: (
        <div style={{ fontSize: 13 }}>
          <div>Giảng viên / Lớp: <strong>chỉ xoá hòm thư</strong>, giữ nguyên dữ liệu (GVCN, lớp, sinh viên).</div>
          {hasCc && <div style={{ color: '#fa541c' }}>Cc: liên hệ sẽ bị <strong>xoá hẳn</strong> khỏi danh bạ.</div>}
          {hasClass && <div style={{ color: '#8c8c8c' }}>Lớp không bị xoá nên sinh viên vẫn còn nguyên.</div>}
        </div>
      ),
      okText: 'Gỡ khỏi danh bạ',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        await onRemove(entries);
        setSelected(new Set());
      },
    });
  };

  const sectionHeader = (label: string, count: number, keys: string[], color?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, color }}>{label} ({count})</span>
      {keys.length > 0 && (
        <a
          style={{ marginLeft: 'auto', fontSize: 12 }}
          onClick={() => (allSelected(keys) ? clearSection(keys) : selectAll(keys))}
        >
          {allSelected(keys) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </a>
      )}
    </div>
  );

  const footer: React.ReactNode[] = [];
  if (selectedEntries.length >= 2) {
    footer.push(
      <Button key="remove" danger icon={<DeleteOutlined />} onClick={confirmRemove}>
        Xóa đã chọn ({selectedEntries.length})
      </Button>
    );
  }
  footer.push(<Button key="close" onClick={handleClose}>Đóng</Button>);
  footer.push(
    <Button key="add" type="primary" disabled={selectedItems.length === 0} onClick={applySelected}>
      Thêm vào người nhận ({selectedItems.length})
    </Button>
  );

  return (
    <Modal
      title="Danh bạ người nhận"
      open={open}
      onCancel={handleClose}
      width={920}
      footer={footer}
    >
      {usingFallback && (
        <div style={{ marginBottom: 12, color: '#fa8c16', fontSize: 12 }}>
          DB đang trống nên preset tạm dùng danh sách mặc định — thêm dòng đầu tiên để chuyển sang dùng DB.
        </div>
      )}
      <div style={{ marginBottom: 12, color: '#8c8c8c', fontSize: 12 }}>
        Tick chọn người → Giảng viên/Lớp vào mục <strong>To</strong>, Cc vào mục <strong>Cc</strong> → bấm “Thêm vào người nhận”.
        Tick từ 2 dòng trở lên để hiện nút <strong>Xóa đã chọn</strong> (GV/Lớp chỉ gỡ hòm thư, Cc xoá hẳn).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          {sectionHeader('Giảng viên', teachers.length, teacherKeys)}
          {teachers.map(t => {
            const lock = invalidEmail(t.email) ? 'Chưa có email hợp lệ' : '';
            return (
              <SelectableRow
                key={t.id}
                checked={selected.has(`t-${t.id}`)}
                disabled={!!lock}
                lockReason={lock}
                onToggle={() => toggle(`t-${t.id}`)}
              >
                <NameEmailRow
                  name={t.full_name}
                  email={t.email}
                  namePlaceholder="Tên giảng viên"
                  onSave={(name, email) => props.onUpdateTeacher(t.id, { full_name: name, email })}
                  onDelete={() => onRemove([{ type: 'teacher', id: t.id }])}
                  deleteTitle="Gỡ giảng viên khỏi danh bạ?"
                  deleteDescription="Chỉ xoá hòm thư. Giảng viên và phân công GVCN vẫn giữ nguyên."
                />
              </SelectableRow>
            );
          })}
          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên GV mới" />
            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email mới" onPressEnter={addTeacher} />
            <Button type="dashed" icon={<PlusOutlined />} onClick={addTeacher}>Thêm</Button>
          </Space.Compact>
        </div>

        <div>
          {sectionHeader('Lớp', classes.length, classKeys)}
          {classes.map(c => {
            const lock = invalidEmail(c.email) ? 'Lớp chưa có hòm thư' : '';
            return (
              <SelectableRow
                key={c.class_code}
                checked={selected.has(`c-${c.class_code}`)}
                disabled={!!lock}
                lockReason={lock}
                onToggle={() => toggle(`c-${c.class_code}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag style={{ marginRight: 0, padding: '4px 10px', display: 'flex', alignItems: 'center' }}>{c.class_code}</Tag>
                  <NameEmailRow
                    name={c.class_code}
                    email={c.email || ''}
                    namePlaceholder="Mã lớp"
                    nameReadOnly
                    onSave={(_name, email) => props.onUpdateClassEmail(c.class_code, email)}
                    onDelete={() => onRemove([{ type: 'class', code: c.class_code }])}
                    deleteTitle={`Gỡ hòm thư lớp ${c.class_code} khỏi danh bạ?`}
                    deleteDescription="Chỉ xoá hòm thư. Lớp và toàn bộ sinh viên vẫn giữ nguyên."
                  />
                </div>
              </SelectableRow>
            );
          })}
          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
            <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Mã lớp, VD: ITK50C" style={{ maxWidth: 150 }} />
            <Input value={newClassEmail} onChange={e => setNewClassEmail(e.target.value)} placeholder="Hòm thư lớp" onPressEnter={addClass} />
            <Button type="dashed" icon={<PlusOutlined />} onClick={addClass}>Thêm</Button>
          </Space.Compact>

          <div style={{ marginTop: 16 }}>
            {sectionHeader('Cc — Ban lãnh đạo', ccList.length, ccKeys, '#722ed1')}
            {ccList.map(c => {
              const lock = invalidEmail(c.email) ? 'Chưa có email hợp lệ' : '';
              return (
                <SelectableRow
                  key={c.id}
                  checked={selected.has(`cc-${c.id}`)}
                  disabled={!!lock}
                  lockReason={lock}
                  onToggle={() => toggle(`cc-${c.id}`)}
                >
                  <NameEmailRow
                    name={c.name}
                    email={c.email}
                    namePlaceholder="Tên"
                    onSave={(name, email) => props.onUpdateCc(c.id, { name, email })}
                    onDelete={() => onRemove([{ type: 'cc', id: c.id }])}
                    deleteTitle="Xóa người này khỏi cụm Cc?"
                  />
                </SelectableRow>
              );
            })}
            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
              <Input value={newCcName} onChange={e => setNewCcName(e.target.value)} placeholder="Tên mới" />
              <Input value={newCcEmail} onChange={e => setNewCcEmail(e.target.value)} placeholder="Email mới" onPressEnter={addCc} />
              <Button type="dashed" icon={<PlusOutlined />} onClick={addCc}>Thêm</Button>
            </Space.Compact>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DirectoryModal;
