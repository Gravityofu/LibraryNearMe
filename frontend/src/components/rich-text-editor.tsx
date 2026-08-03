"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

// 게시판 글쓰기에서 공통으로 쓰는 리치 텍스트 에디터입니다.
// 굵게 / 밑줄 / 글머리 목록 / 번호 목록 / 사진 삽입을 지원합니다.
export default function RichTextEditor({ value, onChange }: Props) {
  const { t } = useI18n();
  const { notify } = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Image],
    content: value,
    immediatelyRender: false, // Next.js에서 서버와 브라우저의 첫 화면이 다르게 그려지는 문제를 막아줍니다.
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[240px] rounded-b-lg border border-t-0 border-neutral-200 bg-white px-4 py-3 text-sm focus:outline-none " +
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 " +
          "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_strong]:font-bold [&_u]:underline",
      },
    },
  });

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/uploads/board-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      editor.chain().focus().setImage({ src: data.url }).run();
    } else {
      notify("❌ " + t("editor.imageUploadFail"), "error");
    }
  }

  if (!editor) return null;

  function ToolbarButton({
    active,
    onClick,
    label,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`cursor-pointer rounded px-2.5 py-1.5 text-sm font-medium ${
          active ? "bg-[#383838] text-[#F9F6F0]" : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label={t("editor.bold")}
        />
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label={t("editor.underline")}
        />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label={t("editor.bulletList")}
        />
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label={t("editor.orderedList")}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          {t("editor.insertImage")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleImageSelected}
          className="hidden"
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}