"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination";
import { useI18n } from "@/components/language-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
};

export default function PublicBoardListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [boards, setBoards] = useState<Board[]>([]);
  const [rows, setRows] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentBoard = boards.find((b) => b.code === code) || null;

  const columnCount =
    6 + (currentBoard?.listStyle === "THUMBNAIL" ? 1 : 0) + (currentBoard?.isMaterialRequest ? 1 : 0) - 1; // 관리 칼럼이 없어서 -1

  async function loadBoards() {
    const res = await fetch(`${API_URL}/public/boards`);
    if (res.ok) setBoards(await res.json());
  }

  async function loadPosts() {
    setLoading(true);
    const res = await fetch(`${API_URL}/public/boards/${code}/posts?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.items);
      setTotal(data.total);
    } else {
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, page]);

  function goToPage(p: number) {
    router.push(`/boards/${code}?page=${p}`);
  }

  return (
    <main>
      {/* 게시판 탭 */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {boards.map((b) => (
          <Link
            key={b.code}
            href={`/boards/${b.code}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              b.code === code
                ? "bg-[#383838] text-[#F9F6F0]"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t(`boards.tabs.${b.code}`)}
          </Link>
        ))}
      </div>

      <h1 className="mb-3 text-lg font-bold">{t(`boards.tabs.${code}`)}</h1>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
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
                <tr key={row.id} className="hover:bg-neutral-50">
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
                  <td className="max-w-[320px] truncate px-4 py-2.5 font-medium">
                    <Link href={`/boards/${code}/${row.id}`} className="hover:underline">
                      {row.title}
                    </Link>
                  </td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </main>
  );
}