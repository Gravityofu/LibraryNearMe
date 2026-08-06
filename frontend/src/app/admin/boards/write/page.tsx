"use client";

import { Suspense, useEffect, useRef, useState, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemedButton from "@/components/themed-button";
import AdminBackButton from "@/components/admin-back-button";
import RichTextEditor from "@/components/rich-text-editor";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const BOARD_CODES = [
  "newArrivals",
  "collection",
  "refService",
  "scrap",
  "dailyQuote",
  "notice",
  "news",
  "openBoard",
  "faq",
  "materialRequest",
];

type Board = {
  id: number;
  code: string;
  name: string;
  isMaterialRequest: boolean;
  listStyle: "LIST" | "THUMBNAIL";
  thumbnailRatio: "WIDE" | "TALL";
};
type Comment = {
  id: number;
  content: string;
  guestName: string | null;
  createdAt: string;
  authorUser: { name: string } | null;
};

function AdminBoardWritePageInner() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();

  const boardCode = searchParams.get("board") && BOARD_CODES.includes(searchParams.get("board")!)
    ? searchParams.get("board")!
    : BOARD_CODES[0];
  const postId = searchParams.get("postId");
  const isEdit = !!postId;

  const [board, setBoard] = useState<Board | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 키워드 (자료 등록의 '주제어'와 같은 방식: 단어 + 스페이스바로 칸 추가)
  const [keywordWords, setKeywordWords] = useState<string[]>([""]);
  const [maxKeywords, setMaxKeywords] = useState(10);
  const keywordInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // '자료를 신청합니다' 게시판일 때만 쓰는 값들입니다.
  const [requestTypeOptions, setRequestTypeOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [materialTitle, setMaterialTitle] = useState(""); // 자료 자체의 타이틀 (예: 책 이름)
  const [requestType, setRequestType] = useState("");
  const [requestAuthor, setRequestAuthor] = useState("");
  const [status, setStatus] = useState("REQUESTED");

  // 댓글 관리 (수정 화면에서만 씁니다)
  const [comments, setComments] = useState<Comment[]>([]);

  function goToTab(code: string) {
    router.push(`/admin/boards?board=${code}`);
  }

  async function loadBoard() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const list: Board[] = await res.json();
      setBoard(list.find((b) => b.code === boardCode) || null);
    }
  }

  // 키워드 최대 개수는 로그인 없이도 볼 수 있는 도서관 공개 정보(GET /library)에서 가져옵니다. (자료 등록의 '주제어'와 같은 설정을 함께 씁니다)
  async function loadMaxKeywords() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      if (data?.maxSubjectKeywords) {
        setMaxKeywords(data.maxSubjectKeywords);
      }
    }
  }

  async function loadMaterialRequestOptions() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/posts/material-request-options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRequestTypeOptions(data.types);
      setStatusOptions(data.statuses);
      if (!requestType && data.types.length > 0) setRequestType(data.types[0]);
    }
  }

  async function loadExistingPost() {
    if (!postId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTitle(data.title);
      setContent(data.content);
      const existingKeywords = data.keywords
        ? String(data.keywords).split(",").map((w: string) => w.trim()).filter(Boolean)
        : [];
      setKeywordWords(existingKeywords.length > 0 ? existingKeywords : [""]);
      if (data.materialRequest) {
        setMaterialTitle(data.materialRequest.title || "");
        setRequestType(data.materialRequest.requestType);
        setRequestAuthor(data.materialRequest.author || "");
        setStatus(data.materialRequest.status);
      }
    } else {
      notify("❌ " + t("boards.write.loadFail"), "error");
    }
  }

  async function loadComments() {
    if (!postId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/comments?postId=${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setComments(await res.json());
    }
  }

  useEffect(() => {
    loadBoard();
    loadExistingPost();
    loadComments();
    loadMaxKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCode, postId]);

  useEffect(() => {
    if (board?.isMaterialRequest) {
      loadMaterialRequestOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.isMaterialRequest]);

  // 키워드 칸 하나의 내용이 바뀔 때
  function updateKeywordWord(index: number, value: string) {
    setKeywordWords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  // 키워드 칸에서 스페이스바를 누르면 다음 칸을 만들고, 빈 칸에서 백스페이스를 누르면 그 칸을 지웁니다.
  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === " ") {
      e.preventDefault();
      const isLast = index === keywordWords.length - 1;
      const hasText = keywordWords[index].trim().length > 0;
      if (isLast && hasText && keywordWords.length < maxKeywords) {
        setKeywordWords((prev) => [...prev, ""]);
        setTimeout(() => keywordInputRefs.current[index + 1]?.focus(), 0);
      }
    } else if (e.key === "Backspace" && keywordWords[index] === "" && index > 0) {
      e.preventDefault();
      setKeywordWords((prev) => prev.filter((_, i) => i !== index));
      setTimeout(() => keywordInputRefs.current[index - 1]?.focus(), 0);
    }
  }

  // 키워드 칸의 'x' 버튼을 눌러서 그 칸을 지웁니다. 마지막 하나 남은 칸이면
  // (키워드를 하나도 입력하지 않은 상태로 만들기 위해) 완전히 없애지 않고 빈 칸으로 되돌립니다.
  function removeKeywordWord(index: number) {
    setKeywordWords((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      notify("❌ " + t("boards.write.titleRequired"), "error");
      return;
    }
    if (board?.isMaterialRequest && !materialTitle.trim()) {
      notify("❌ " + t("boards.write.materialTitleRequired"), "error");
      return;
    }
    if (!content.trim()) {
      notify("❌ " + t("boards.write.contentRequired"), "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || !board) return;

    const keywordsValue = keywordWords.map((w) => w.trim()).filter(Boolean).join(",");

    const body: any = { title, content, keywords: keywordsValue };
    if (board.isMaterialRequest) {
      body.materialTitle = materialTitle;
      body.requestType = requestType;
      body.requestAuthor = requestAuthor;
      body.status = status;
    }
    if (!isEdit) {
      body.boardId = board.id;
    }

    const url = isEdit ? `${API_URL}/posts/${postId}` : `${API_URL}/posts`;
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("boards.write.saveSuccess"), "success");
      goToTab(boardCode);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.write.saveFail")), "error");
    }
  }

  async function handleDeleteComment(id: number) {
    if (!window.confirm(t("boards.write.comments.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/comments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("boards.write.comments.deleteSuccess"), "success");
      loadComments();
    } else {
      notify("❌ " + t("boards.write.comments.deleteFail"), "error");
    }
  }

  return (
    <div className="p-6">
      <Tabs value={boardCode} onValueChange={goToTab}>
        <TabsList className="flex-wrap gap-2">
          {BOARD_CODES.map((code) => (
            <TabsTrigger key={code} value={code}>
              {t(`boards.tabs.${code}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4 mt-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          {isEdit ? t("boards.write.pageTitleEdit") : t("boards.write.pageTitleNew")}
        </h1>
        <AdminBackButton href={`/admin/boards?board=${boardCode}`} />
      </div>

      <div className="flex w-full flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.title")} *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-neutral-500">
            {t("boards.write.field.keywords")} ({keywordWords.filter((w) => w.trim()).length}/{maxKeywords})
          </span>
          <div className="flex flex-wrap gap-2">
            {keywordWords.map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white pr-1"
              >
                <input
                  ref={(el) => {
                    keywordInputRefs.current[i] = el;
                  }}
                  value={word}
                  onChange={(e) => updateKeywordWord(i, e.target.value)}
                  onKeyDown={(e) => handleKeywordKeyDown(e, i)}
                  className="w-24 rounded-lg border-0 px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeKeywordWord(i)}
                  className="cursor-pointer rounded px-1 text-sm leading-none text-neutral-400 hover:text-red-500"
                  title={t("boards.write.keywordRemove")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">{t("boards.write.keywordsHint")}</p>
        </label>

        {board?.isMaterialRequest && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.materialTitle")} *</span>
              <input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.requestType")}</span>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {requestTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.requestAuthor")}</span>
                <input
                  value={requestAuthor}
                  onChange={(e) => setRequestAuthor(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.status")}</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full max-w-xs cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`boards.status.${opt}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <div>
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.content")} *</span>
          {board?.listStyle === "THUMBNAIL" && (
            <p className="mb-2 text-xs text-neutral-400">
              {board.thumbnailRatio === "TALL"
                ? t("boards.write.thumbnailHint.tall")
                : t("boards.write.thumbnailHint.wide")}
            </p>
          )}
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div className="flex justify-end">
          <ThemedButton preset="버튼1" onClick={handleSave}>
            {t("boards.write.save")}
          </ThemedButton>
        </div>

        {/* 댓글 관리 - 글 수정 화면에서만 보입니다. */}
        {isEdit && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-neutral-700">
              {t("boards.write.comments.title")} ({comments.length})
            </h2>
            {comments.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("boards.write.comments.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 text-xs text-neutral-500">
                        {c.authorUser?.name || c.guestName || t("boards.write.comments.guest")} ·{" "}
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm text-neutral-800">{c.content}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="shrink-0 cursor-pointer rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      {t("boards.write.comments.deleteBtn")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBoardWritePage() {
  return (
    <Suspense fallback={null}>
      <AdminBoardWritePageInner />
    </Suspense>
  );
}