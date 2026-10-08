import React, { useState } from 'react';
import { Modal, Input, Button, Space, Tag, Popconfirm, message } from 'antd';
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

interface DirectoryModalProps {
  open: boolean;
  onClose: () => void;
  teachers: DirTeacher[];
  classes: DirClass[];
  ccList: DirCc[];
  /** true khi DB trống và preset đang rớt về danh sách cứng */
  usingFallback: boolean;
  onAddTeacher: (name: string, email: string) => Promise<void>;
  onUpdateTeacher: (id: number, patch: { full_name?: string; email?: string }) => Promise<void>;
  onDeleteTeacher: (id: number) => Promise<void>;
  onAddClass: (code: string, email: string) => Promise<void>;
  onUpdateClassEmail: (code: string, email: string) => Promise<void>;
  onDeleteClass: (code: string) => Promise<void>;
  onAddCc: (name: string, email: string) => Promise<void>;
  onUpdateCc: (id: number, patch: { name?: string; email?: string }) => Promise<void>;
  onDeleteCc: (id: number) => Promise<void>;
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

// Popup Danh bạ: đọc/ghi thẳng DB, sửa tại chỗ. Trái: giảng viên. Phải: lớp + CC.
const DirectoryModal: React.FC<DirectoryModalProps> = (props) => {
  const { open, onClose, teachers, classes, ccList, usingFallback } = props;
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newClassEmail, setNewClassEmail] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');

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

  return (
    <Modal
      title="Danh bạ người nhận"
      open={open}
      onCancel={onClose}
      width={900}
      footer={[<Button key="close" type="primary" onClick={onClose}>Xong</Button>]}
    >
      {usingFallback && (
        <div style={{ marginBottom: 12, color: '#fa8c16', fontSize: 12 }}>
          DB đang trống nên preset tạm dùng danh sách mặc định — thêm dòng đầu tiên để chuyển sang dùng DB.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Giảng viên ({teachers.length})</div>
          {teachers.map(t => (
            <NameEmailRow
              key={t.id}
              name={t.full_name}
              email={t.email}
              namePlaceholder="Tên giảng viên"
              onSave={(name, email) => props.onUpdateTeacher(t.id, { full_name: name, email })}
              onDelete={() => props.onDeleteTeacher(t.id)}
              deleteTitle="Xóa giảng viên này khỏi danh bạ?"
              deleteDescription="Lớp do người này phụ trách sẽ thành chưa gán GVCN (gán lại được)."
            />
          ))}
          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên GV mới" />
            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email mới" onPressEnter={addTeacher} />
            <Button type="dashed" icon={<PlusOutlined />} onClick={addTeacher}>Thêm</Button>
          </Space.Compact>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Lớp ({classes.length})</div>
          {classes.map(c => (
            <div key={c.class_code} style={{ display: 'flex', marginBottom: 6 }}>
              <Tag style={{ marginRight: 0, padding: '4px 10px', display: 'flex', alignItems: 'center' }}>{c.class_code}</Tag>
              <NameEmailRow
                name={c.class_code}
                email={c.email || ''}
                namePlaceholder="Mã lớp"
                nameReadOnly
                onSave={(_name, email) => props.onUpdateClassEmail(c.class_code, email)}
                onDelete={() => props.onDeleteClass(c.class_code)}
                deleteTitle={`Xóa lớp ${c.class_code} khỏi danh bạ?`}
                deleteDescription="CẢNH BÁO: xóa lớp sẽ xóa luôn toàn bộ sinh viên của lớp trong DB."
              />
            </div>
          ))}
          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
            <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Mã lớp, VD: ITK50C" style={{ maxWidth: 150 }} />
            <Input value={newClassEmail} onChange={e => setNewClassEmail(e.target.value)} placeholder="Hòm thư lớp" onPressEnter={addClass} />
            <Button type="dashed" icon={<PlusOutlined />} onClick={addClass}>Thêm</Button>
          </Space.Compact>

          <div style={{ fontWeight: 600, marginBottom: 8, marginTop: 16, color: '#722ed1' }}>Cc — Ban lãnh đạo ({ccList.length})</div>
          {ccList.map(c => (
            <NameEmailRow
              key={c.id}
              name={c.name}
              email={c.email}
              namePlaceholder="Tên"
              onSave={(name, email) => props.onUpdateCc(c.id, { name, email })}
              onDelete={() => props.onDeleteCc(c.id)}
              deleteTitle="Xóa người này khỏi cụm Cc?"
            />
          ))}
          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
            <Input value={newCcName} onChange={e => setNewCcName(e.target.value)} placeholder="Tên mới" />
            <Input value={newCcEmail} onChange={e => setNewCcEmail(e.target.value)} placeholder="Email mới" onPressEnter={addCc} />
            <Button type="dashed" icon={<PlusOutlined />} onClick={addCc}>Thêm</Button>
          </Space.Compact>
        </div>
      </div>
    </Modal>
  );
};

export default DirectoryModal;
