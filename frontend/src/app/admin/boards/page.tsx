"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemedButton from "@/components/themed-button";
import Pagination from "@/components/pagination";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// 1단계에서 만든 기본 10개 게시판과 같은 순서/코드입니다.
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
  listStyle: "LIST" | "THUMBNAIL";
  isMaterialRequest: boolean;
};

type PostRow = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  authorName: string;
  viewCount: number;
  createdAt: string;
  materialRequestStatus: string | null;
  referenceCount: number;
};

function AdminBoardsPageInner() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("board");
  const [activeTab, setActiveTab] = useState(
    initialTab && BOARD_CODES.includes(initialTab) ? initialTab : BOARD_CODES[0],
  );

  const [boards, setBoards] = useState<Board[]>([]);
  const [rows, setRows] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const currentBoard = boards.find((b) => b.code === activeTab) || null;
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 표에 실제로 몇 개의 칼럼이 나오는지 계산합니다. (번호/제목/작성자/작성일/조회수/참고자료/관리 = 기본 7개 + 사진(썸네일형) + 처리상태(자료신청))
  const columnCount =
    7 + (currentBoard?.listStyle === "THUMBNAIL" ? 1 : 0) + (currentBoard?.isMaterialRequest ? 1 : 0);

  // 주소(?board=)를 지금 보고 있는 탭과 맞춰 둡니다. (브레드크럼이 탭에 맞게 나오도록 하기 위함입니다.)
  useEffect(() => {
    router.replace(`/admin/boards?board=${activeTab}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 탭을 바꾸면 1페이지부터 다시 봅니다.
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  async function loadBoards() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setBoards(await res.json());
    }
  }

  async function loadPosts(boardId: number, p: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/posts?boardId=${boardId}&page=${p}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRows(data.items);
      setTotal(data.total);
    } else {
      notify("❌ " + t("boards.list.loadFail"), "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentBoard) {
      loadPosts(currentBoard.id, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBoard?.id, page]);

  async function handleDelete(id: number) {
    if (!window.confirm(t("boards.list.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("boards.list.deleteSuccess"), "success");
      if (currentBoard) loadPosts(currentBoard.id, page);
    } else {
      notify("❌ " + t("boards.list.deleteFail"), "error");
    }
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap gap-2">
          {BOARD_CODES.map((code) => (
            <TabsTrigger key={code} value={code}>
              {t(`boards.tabs.${code}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex items-center justify-end">
        <Link href={`/admin/boards/write?board=${activeTab}`}>
          <ThemedButton preset="버튼1">{t("boards.list.writeBtn")}</ThemedButton>
        </Link>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">{t("boards.list.col.no")}</th>
              {currentBoard?.listStyle === "THUMBNAIL" && (
                <th className="px-4 py-2.5">{t("boards.list.col.thumbnail")}</th>
              )}
              <th className="px-4 py-2.5">{t("boards.list.col.title")}</th>
              <th className="px-4 py-2.5">{t("boards.list.col.author")}</th>
              <th className="px-4 py-2.5">{t("boards.list.col.createdAt")}</th>
              <th className="px-4 py-2.5">{t("boards.list.col.viewCount")}</th>
              {currentBoard?.isMaterialRequest && (
                <th className="px-4 py-2.5">{t("boards.list.col.status")}</th>
              )}
              <th className="px-4 py-2.5">{t("boards.list.col.reference")}</th>
              <th className="px-4 py-2.5">{t("boards.list.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-6 text-center text-neutral-400">
                  ...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-6 text-center text-neutral-400">
                  {t("boards.list.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/boards/write?board=${activeTab}&postId=${row.id}`)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  {/* 번호: 가장 최근 글이 가장 큰 번호가 되도록 계산합니다. */}
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                    {total - ((page - 1) * pageSize + idx)}
                  </td>
                  {currentBoard?.listStyle === "THUMBNAIL" && (
                    <td className="px-4 py-2.5">
                      {row.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.thumbnailUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-neutral-100" />
                      )}
                    </td>
                  )}
                  <td className="max-w-[320px] truncate px-4 py-2.5 font-medium">{row.title}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{row.authorName}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{row.viewCount}</td>
                  {currentBoard?.isMaterialRequest && (
                    <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                      {row.materialRequestStatus ? t(`boards.status.${row.materialRequestStatus}`) : "-"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/boards/reference?board=${activeTab}&postId=${row.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                      >
                        {t("boards.list.referenceBtn")}
                      </Link>
                      <span className="text-xs text-neutral-400">({row.referenceCount})</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id);
                      }}
                      className="cursor-pointer rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      {t("boards.list.deleteBtn")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

export default function AdminBoardsPage() {
  return (
    <Suspense fallback={null}>
      <AdminBoardsPageInner />
    </Suspense>
  );
}