import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined,
} from '@ant-design/icons';

interface EmailEditorProps {
  value?: string;
  onChange?: (html: string) => void;
}

// Rich text editor cho Body email (Gói 3): đậm/nghiêng/gạch chân,
// list, link. Không chèn ảnh (giữ scope).
// Dùng trong AntD Form.Item qua props value/onChange chuẩn.
const EmailEditor: React.FC<EmailEditorProps> = ({ value, onChange }) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const editor = useEditor({
    // TipTap v3 đã gồm sẵn underline + link trong StarterKit —
    // KHÔNG add rời (trùng tên gây crash editor). Cấu hình link tại đây.
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
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
