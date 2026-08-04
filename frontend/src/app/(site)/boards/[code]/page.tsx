"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination";
import SitePageHeader from "@/components/site-page-header";
import { useI18n } from "@/components/language-provider";
import { getBoardGroupKey } from "@/lib/site-nav";
import { formatKstDate } from "@/lib/date";

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
  contentExcerpt?: string;
  keywords?: string[];
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
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentBoard = boards.find((b) => b.code === code) || null;
  const isThumbnail = currentBoard?.listStyle === "THUMBNAIL";

  const columnCount = 5 + (currentBoard?.isMaterialRequest ? 1 : 0);

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
      setPageSize(data.pageSize || 15);
    } else {
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }

  // 키워드 글자 색상으로 쓸, 설정 > 도서관 메뉴에서 지정한 도서관 대표 색상을 가져옵니다.
  async function loadPrimaryColor() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      setPrimaryColor(data?.primaryColor || null);
    }
  }

  useEffect(() => {
    loadBoards();
    loadPrimaryColor();
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
      <SitePageHeader
        crumbs={[t("nav.home"), t(getBoardGroupKey(code)), t(`boards.tabs.${code}`)]}
        title={t(`boards.tabs.${code}`)}
      />

      {isThumbnail ? (
        // 썸네일형 게시판: 카드형 목록 (한 행에 3개)
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading ? (
            <p className="col-span-full py-10 text-center text-sm text-neutral-400">...</p>
          ) : rows.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-neutral-400">{t("boards.list.empty")}</p>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                href={`/boards/${code}/${row.id}`}
                className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white hover:shadow-sm"
              >
                <div className="aspect-square w-full bg-neutral-100">
                  {row.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-300">
                      {t("boards.list.col.thumbnail")}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-1 text-sm font-bold">{row.title}</h3>
                  {row.contentExcerpt && (
                    <p className="line-clamp-2 text-xs text-neutral-500">{row.contentExcerpt}</p>
                  )}
                  {code === "openBoard" && (
                    <p className="text-right text-xs text-neutral-400">{row.authorName}</p>
                  )}
                  {row.keywords && row.keywords.length > 0 && (
                    <p className="line-clamp-3 text-xs" style={{ color: primaryColor || "#3b82f6" }}>
                      {row.keywords.map((k) => `#${k}`).join(" ")}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        // 목록형 게시판: 표 형태
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">{t("boards.list.col.no")}</th>
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
                    <td className="max-w-[320px] truncate px-4 py-2.5 font-medium">
                      <Link href={`/boards/${code}/${row.id}`} className="hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{row.authorName}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                      {formatKstDate(row.createdAt)}
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
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </main>
  );
}