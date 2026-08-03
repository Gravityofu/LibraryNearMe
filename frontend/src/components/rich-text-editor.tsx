"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

// 글자 색상 버튼에 보여줄 색상들입니다.
const COLOR_SWATCHES = ["#111111", "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB", "#7C3AED"];

// 폰트 선택 드롭다운에 보여줄 항목입니다. (새 폰트 파일을 추가로 불러오지 않고, 컴퓨터에 이미 있는 글꼴만 씁니다.)
const FONT_OPTIONS = [
  { value: "", labelKey: "editor.fontFamily.default" },
  { value: "ui-sans-serif, system-ui, sans-serif", labelKey: "editor.fontFamily.sans" },
  { value: "ui-serif, Georgia, serif", labelKey: "editor.fontFamily.serif" },
  { value: "ui-monospace, monospace", labelKey: "editor.fontFamily.mono" },
];

// 자주 쓰는 이모티콘 목록입니다.
const EMOJI_LIST = [
  "😀", "😂", "😍", "🥰", "😉", "😊", "😢", "😭", "😮", "😅",
  "🙏", "👍", "👏", "🎉", "❤️", "⭐", "🔥", "✅", "❗", "❓",
  "📚", "📌", "📅", "💡", "🐶", "🐱", "🌸", "☕", "🍀", "🎁",
];

// 게시판 글쓰기에서 공통으로 쓰는 리치 텍스트 에디터입니다.
export default function RichTextEditor({ value, onChange }: Props) {
  const { t } = useI18n();
  const { notify } = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      TextStyle,
      Color,
      FontFamily,
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
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
          "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_strong]:font-bold [&_u]:underline " +
          "[&_a]:text-blue-600 [&_a]:underline " +
          "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse " +
          "[&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_align-top]:align-top " +
          "[&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left",
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

  function handleLinkButton() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt(t("editor.linkPrompt"));
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function handleEmojiPick(emoji: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  }

  if (!editor) return null;

  function ToolbarButton({
    active,
    onClick,
    label,
    disabled,
  }: {
    active?: boolean;
    onClick: () => void;
    label: string;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`cursor-pointer rounded px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
          active ? "bg-[#383838] text-[#F9F6F0]" : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        {label}
      </button>
    );
  }

  const isInTable = editor.isActive("table");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        {/* 글자 서식 */}
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

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 글꼴 */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          defaultValue=""
          className="cursor-pointer rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs"
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.labelKey} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>

        {/* 글자 색상 */}
        <div className="flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-1">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => editor.chain().focus().setColor(color).run()}
              className="h-4 w-4 cursor-pointer rounded-full border border-neutral-200"
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="cursor-pointer px-1 text-xs text-neutral-500 hover:text-neutral-800"
          >
            {t("editor.colorReset")}
          </button>
        </div>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 링크 */}
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={handleLinkButton}
          label={editor.isActive("link") ? t("editor.unlink") : t("editor.link")}
        />

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 사진 삽입 */}
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

        {/* 이모티콘 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="cursor-pointer rounded px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            {t("editor.emoji")} 🙂
          </button>
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 grid w-64 grid-cols-10 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiPick(emoji)}
                    className="cursor-pointer rounded p-1 text-lg hover:bg-neutral-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 표(테이블) */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          label={t("editor.table")}
        />
        {isInTable && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              label={t("editor.tableAddRow")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              label={t("editor.tableDeleteRow")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              label={t("editor.tableAddColumn")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              label={t("editor.tableDeleteColumn")}
            />
            <ToolbarButton
              disabled={!editor.can().mergeCells()}
              onClick={() => editor.chain().focus().mergeCells().run()}
              label={t("editor.tableMergeCells")}
            />
            <ToolbarButton
              disabled={!editor.can().splitCell()}
              onClick={() => editor.chain().focus().splitCell().run()}
              label={t("editor.tableSplitCell")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              label={t("editor.tableDelete")}
            />
          </>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}