'use client';

import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Undo2, Redo2,
  LinkIcon, ImageIcon, Loader2,
} from 'lucide-react';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#ECE6F0' };

function ToolbarButton({ onClick, active, disabled, children, title }: {
  onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-30"
      style={{ background: active ? B.a : 'transparent', color: active ? '#fff' : B.p }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5EFFA'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'underline', style: `color:${B.a}` } }),
      Placeholder.configure({ placeholder: placeholder ?? 'اكتب محتوى المقال هنا…' }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[280px] px-4 py-3' },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const fd = new FormData();
      fd.append('images', files[0]);
      const res = await api.upload<{ success: boolean; data: { urls: string[] } }>('/api/upload', fd);
      editor.chain().focus().setImage({ src: res.data.urls[0] }).run();
    } catch { toast.error('فشل رفع الصورة'); }
    finally { uploadingRef.current = false; }
  };

  const setLink = () => {
    const url = window.prompt('رابط الوصلة:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: B.border }}>
      <div className="flex items-center gap-0.5 p-1.5 border-b flex-wrap" style={{ borderColor: B.border, background: '#FBF9F2' }}>
        <ToolbarButton title="عريض" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton title="مائل" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton title="عنوان كبير" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton title="عنوان صغير" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarButton>
        <ToolbarButton title="قائمة نقطية" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton title="قائمة مرقمة" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton title="اقتباس" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
        <ToolbarButton title="رابط" active={editor.isActive('link')} onClick={setLink}><LinkIcon size={15} /></ToolbarButton>
        <ToolbarButton title="إدراج صورة" onClick={() => fileRef.current?.click()}>
          {uploadingRef.current ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        </ToolbarButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files)} />
        <span className="flex-1" />
        <ToolbarButton title="تراجع" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton title="إعادة" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} dir="rtl" />
    </div>
  );
}
