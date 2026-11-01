import React, { useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Button } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined,
} from '@ant-design/icons';

export interface AssignmentPreviewRow {
  StudentID: string;
  FirstName: string;
  LastName: string;
  ClassStudentID: string;
}

interface EmailEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  /** SV được phân công — hiện bảng xem trước ngay trước lời kết (không lưu vào nội dung) */
  assignmentRows?: AssignmentPreviewRow[];
}

// Mốc lời kết, ưu tiên giống backend (server.js insertBeforeClosing)
const CLOSING_MARKERS = ['Kính mong', 'Kính nhờ', 'Trân trọng cảm ơn', 'Trân trọng.'];
const PREVIEW_CAP = 50;
// Plugin state giữ danh sách SV hiện tại (tránh đọc React ref trong lúc render)
const assignmentPreviewKey = new PluginKey<AssignmentPreviewRow[]>('assignmentPreview');

// Tìm vị trí đoạn kết: ưu tiên "Kính mong" → "Kính nhờ" → "Trân trọng cảm ơn" → "Trân trọng."
const findClosingPos = (doc: PMNode): number | null => {
  const matches: Array<{ pos: number; priority: number }> = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textContent;
    for (let p = 0; p < CLOSING_MARKERS.length; p++) {
      if (text.includes(CLOSING_MARKERS[p])) {
        matches.push({ pos, priority: p });
        break;
      }
    }
  });
  if (matches.length === 0) return null;
  // Ưu tiên mốc thứ tự backend; cùng mốc thì lấy lần xuất hiện cuối
  matches.sort((a, b) => a.priority - b.priority || b.pos - a.pos);
  return matches[0].pos;
};

// Dựng DOM bảng preview (thuần DOM, không phải nội dung ProseMirror)
const buildPreviewDom = (rows: AssignmentPreviewRow[]): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.className = 'tc-assign-preview';
  wrap.contentEditable = 'false';

  const title = document.createElement('div');
  title.className = 'tc-assign-preview-title';
  title.textContent = `Các sinh viên được phân công (${rows.length}) — xem trước`;
  wrap.appendChild(title);

  const scroll = document.createElement('div');
  scroll.className = 'tc-assign-preview-scroll';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['MSSV', 'Họ tên', 'Lớp'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.slice(0, PREVIEW_CAP).forEach((r) => {
    const tr = document.createElement('tr');
    [r.StudentID, `${r.FirstName} ${r.LastName}`.trim() || '—', r.ClassStudentID || '—'].forEach((val) => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  scroll.appendChild(table);
  wrap.appendChild(scroll);

  if (rows.length > PREVIEW_CAP) {
    const more = document.createElement('div');
    more.className = 'tc-assign-preview-note';
    more.textContent = `… và ${rows.length - PREVIEW_CAP} sinh viên khác (file Excel đính kèm khi gửi).`;
    wrap.appendChild(more);
  }
  const hint = document.createElement('div');
  hint.className = 'tc-assign-preview-note';
  hint.textContent = 'Bảng xem trước — không lưu vào nội dung email.';
  wrap.appendChild(hint);

  return wrap;
};

// Rich text editor cho Body email (Gói 3): đậm/nghiêng/gạch chân,
// list, link. Không chèn ảnh (giữ scope).
// Dùng trong AntD Form.Item qua props value/onChange chuẩn.
const EmailEditor: React.FC<EmailEditorProps> = ({ value, onChange, assignmentRows }) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const previewExt = useMemo(() => Extension.create({
    name: 'assignmentPreview',
    addProseMirrorPlugins() {
      return [
        new Plugin<AssignmentPreviewRow[]>({
          key: assignmentPreviewKey,
          state: {
            init: () => [],
            apply(tr, prev) {
              const next = tr.getMeta(assignmentPreviewKey);
              return Array.isArray(next) ? next : prev;
            },
          },
          props: {
            decorations(state) {
              const rows = assignmentPreviewKey.getState(state) || [];
              if (rows.length === 0) return null;
              const pos = findClosingPos(state.doc);
              const at = pos == null ? state.doc.content.size : pos;
              return DecorationSet.create(state.doc, [
                Decoration.widget(at, () => buildPreviewDom(rows), { side: pos == null ? 1 : -1 }),
              ]);
            },
          },
        }),
      ];
    },
  }), []);

  const editor = useEditor({
    // TipTap v3 đã gồm sẵn underline + link trong StarterKit —
    // KHÔNG add rời (trùng tên gây crash editor). Cấu hình link tại đây.
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      previewExt,
    ],
    content: value || '',
    editorProps: { attributes: { class: 'tc-tiptap' } },
    onUpdate: ({ editor }) => { onChangeRef.current?.(editor.getHTML()); },
  });

  // Đồng bộ khi form set giá trị từ ngoài (mở sửa, nút gợi ý nội dung)
  useEffect(() => {
    if (!editor || value === undefined) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  // Danh sách SV thay đổi → đẩy vào plugin state để vẽ lại widget
  // (không đổi doc, không vào undo history, không kích hoạt onUpdate)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.state.tr
        .setMeta(assignmentPreviewKey, assignmentRows || [])
        .setMeta('addToHistory', false)
    );
  }, [editor, assignmentRows]);

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('URL liên kết:', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const tbBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <Button
      key={title}
      size="small"
      type={active ? 'primary' : 'text'}
      icon={icon}
      title={title}
      disabled={!editor}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    />
  );

  return (
    <div className="tc-tiptap-wrap">
      <div className="tc-tiptap-toolbar">
        {tbBtn(!!editor?.isActive('bold'), () => editor?.chain().focus().toggleBold().run(), <BoldOutlined />, 'In đậm')}
        {tbBtn(!!editor?.isActive('italic'), () => editor?.chain().focus().toggleItalic().run(), <ItalicOutlined />, 'In nghiêng')}
        {tbBtn(!!editor?.isActive('underline'), () => editor?.chain().focus().toggleUnderline().run(), <UnderlineOutlined />, 'Gạch chân')}
        {tbBtn(!!editor?.isActive('bulletList'), () => editor?.chain().focus().toggleBulletList().run(), <UnorderedListOutlined />, 'Danh sách gạch đầu dòng')}
        {tbBtn(!!editor?.isActive('orderedList'), () => editor?.chain().focus().toggleOrderedList().run(), <OrderedListOutlined />, 'Danh sách đánh số')}
        {tbBtn(!!editor?.isActive('link'), setLink, <LinkOutlined />, 'Chèn link')}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default EmailEditor;
