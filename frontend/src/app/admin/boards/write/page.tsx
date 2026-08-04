"use client";

import { Suspense, useEffect, useState } from "react";
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

  // '자료를 신청합니다' 게시판일 때만 쓰는 값들입니다.
  const [requestTypeOptions, setRequestTypeOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [materialTitle, setMaterialTitle] = useState(""); // 자료 자체의 타이틀 (예: 책 이름)
  const [requestType, setRequestType] = useState("");
  const [requestAuthor, setRequestAuthor] = useState("");
  const [status, setStatus] = useState("REQUESTED");

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

  useEffect(() => {
    loadBoard();
    loadExistingPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCode, postId]);

  useEffect(() => {
    if (board?.isMaterialRequest) {
      loadMaterialRequestOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.isMaterialRequest]);

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

    const body: any = { title, content };
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

      <div className="flex max-w-3xl flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.title")} *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
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
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div className="flex justify-end">
          <ThemedButton preset="버튼1" onClick={handleSave}>
            {t("boards.write.save")}
          </ThemedButton>
        </div>
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