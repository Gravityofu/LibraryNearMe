"use client";

import { useEffect, useRef, useState } from "react";
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
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { FONT_OPTIONS as SITE_FONT_OPTIONS } from "@/lib/fonts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// 사이트 전체 기본 글꼴(Pretendard)과 정확히 같은 값을 씁니다. (frontend/src/lib/fonts.ts 참고)
const PRETENDARD_STACK = SITE_FONT_OPTIONS[0].stack;

type Props = {
  value: string;
  onChange: (html: string) => void;
};

type BoardFont = {
  id: number;
  name: string;
  fontFamilyName: string;
  googleFontUrl: string | null;
  isDeletable: boolean;
};

type FontDropdownOption = { value: string; label: string };

// 글자 색상 버튼에 보여줄 색상들입니다.
const COLOR_SWATCHES = ["#111111", "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#2563EB", "#7C3AED"];

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
  const [fontOptions, setFontOptions] = useState<FontDropdownOption[]>([
    { value: PRETENDARD_STACK, label: "Pretendard (기본)" },
  ]);

  // '설정 > 게시판'에서 관리하는 글꼴 목록을 불러와서, 드롭다운에 채우고 필요한 폰트 파일도 불러옵니다.
  // 삭제된 폰트는 이 목록에 더 이상 나오지 않으므로, 그 폰트를 불러오는 <link>도 더 이상 추가되지 않습니다.
  // (예전에 그 폰트로 쓴 글은, 폰트가 로드되지 않으므로 저장된 글꼴 값의 다음 순서인 Pretendard로 자동으로 보이게 됩니다.)
  useEffect(() => {
    async function loadFonts() {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_URL}/board-fonts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: BoardFont[] = await res.json();

      const options = data.map((f) => ({
        value: f.isDeletable ? `'${f.fontFamilyName}', ${PRETENDARD_STACK}` : PRETENDARD_STACK,
        label: f.name,
      }));
      setFontOptions(options.length > 0 ? options : [{ value: PRETENDARD_STACK, label: "Pretendard (기본)" }]);

      data.forEach((font, i) => {
        if (!font.googleFontUrl) return;
        const linkId = `board-font-link-${i}`;
        let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = document.createElement("link");
          linkEl.id = linkId;
          linkEl.rel = "stylesheet";
          document.head.appendChild(linkEl);
        }
        linkEl.href = font.googleFontUrl;
      });
    }
    loadFonts();
  }, []);

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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t("editor.placeholder") }),
      CharacterCount,
    ],
    content: value,
    immediatelyRender: false, // Next.js에서 서버와 브라우저의 첫 화면이 다르게 그려지는 문제를 막아줍니다.
    onCreate: ({ editor }) => {
      // 새 글(내용이 비어있는 상태)을 쓰기 시작할 때는, 앞으로 입력할 글자에 Pretendard가 기본으로 적용되게 합니다.
      if (!value) {
        editor.chain().setFontFamily(PRETENDARD_STACK).run();
      }
    },
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
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 " +
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-500 " +
          "[&_pre]:rounded-lg [&_pre]:bg-neutral-900 [&_pre]:text-neutral-100 [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto " +
          "[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
          "[&_hr]:my-4 [&_hr]:border-neutral-200 " +
          "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0 " +
          "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse " +
          "[&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 " +
          "[&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left " +
          "[&_p.is-editor-empty:first-child::before]:text-neutral-400 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:h-0",
      },
    },
  });

  // '수정' 화면처럼, 에디터가 이미 만들어진 뒤에 서버에서 글 내용이 도착하는 경우를 위한 코드입니다.
  // 바깥(글쓰기 화면)에서 전달된 value가 에디터가 지금 가지고 있는 내용과 다르면, 에디터 내용을 새로 채워 넣습니다.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

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

  function handleHeadingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!editor) return;
    const val = e.target.value;
    if (val === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 }).run();
    }
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
  const currentHeadingValue = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "paragraph";
  const currentFontValue = editor.getAttributes("textStyle").fontFamily || PRETENDARD_STACK;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        {/* 되돌리기 / 다시 실행 */}
        <ToolbarButton
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          label={t("editor.undo")}
        />
        <ToolbarButton
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          label={t("editor.redo")}
        />

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 제목 */}
        <select
          value={currentHeadingValue}
          onChange={handleHeadingChange}
          className="cursor-pointer rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs"
        >
          <option value="paragraph">{t("editor.heading.paragraph")}</option>
          <option value="1">{t("editor.heading.h1")}</option>
          <option value="2">{t("editor.heading.h2")}</option>
          <option value="3">{t("editor.heading.h3")}</option>
        </select>

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 글자 서식 */}
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label={t("editor.bold")}
        />
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label={t("editor.italic")}
        />
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label={t("editor.underline")}
        />
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label={t("editor.strike")}
        />
        <ToolbarButton
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          label={t("editor.subscript")}
        />
        <ToolbarButton
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          label={t("editor.superscript")}
        />
        <ToolbarButton
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          label={t("editor.highlight")}
        />

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 목록 / 인용구 / 코드블록 / 구분선 */}
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
        <ToolbarButton
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          label={t("editor.taskList")}
        />
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label={t("editor.blockquote")}
        />
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label={t("editor.codeBlock")}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label={t("editor.horizontalRule")}
        />

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 정렬 */}
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          label={t("editor.alignLeft")}
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          label={t("editor.alignCenter")}
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          label={t("editor.alignRight")}
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          label={t("editor.alignJustify")}
        />

        <span className="mx-1 h-5 w-px bg-neutral-200" />

        {/* 글꼴 - '설정 > 게시판'에서 관리하는 목록입니다. */}
        <select
          value={currentFontValue}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="cursor-pointer rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs"
        >
          {fontOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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
      <div className="mt-1 text-right text-xs text-neutral-400">
        {editor.storage.characterCount.characters()}{t("editor.charCountSuffix")}
      </div>
    </div>
  );
}