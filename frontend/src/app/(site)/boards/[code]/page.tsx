"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination";
import SitePageHeader from "@/components/site-page-header";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { getBoardGroupKey } from "@/lib/site-nav";
import { formatKstDate } from "@/lib/date";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Board = {
  id: number;
  code: string;
  name: string;
  listStyle: "LIST" | "THUMBNAIL";
  isMaterialRequest: boolean;
  allowMemberWrite: boolean;
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
  const { role } = useAuth();
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

  // '자주 묻는 질문' 게시판 아코디언에서 쓰는 상태입니다.
  // expandedId: 지금 펼쳐져 있는 질문의 글 번호 (하나만 펼쳐집니다)
  // faqDetails: 한 번 불러온 질문의 키워드·본문을 글 번호별로 저장해서, 다시 펼 때 또 불러오지 않게 합니다.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [faqDetails, setFaqDetails] = useState<Record<number, { content: string; keywords: string[] }>>({});
  const [faqLoadingId, setFaqLoadingId] = useState<number | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentBoard = boards.find((b) => b.code === code) || null;
  const isThumbnail = currentBoard?.listStyle === "THUMBNAIL";
  // 관리자(ADMIN/SUPER) 계정으로 로그인했다면, 게시판의 '회원 글쓰기' 설정과 상관없이
  // 홈페이지에서는 '글쓰기' 버튼 자체를 보여주지 않습니다. (관리자는 관리자 페이지에서만 글을 씁니다.)
  const isAdmin = role === "ADMIN" || role === "SUPER";

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

  // '자주 묻는 질문' 아코디언용: 이 글의 키워드·본문을 처음 펼칠 때만 서버에서 불러옵니다.
  // (기존에 있는 "글 상세 조회" API를 그대로 재사용합니다. 이 API를 부르면 조회수가 1 올라갑니다.)
  async function loadFaqDetail(id: number) {
    if (faqDetails[id]) return;
    setFaqLoadingId(id);
    const res = await fetch(`${API_URL}/public/posts/${id}`);
    if (res.ok) {
      const data = await res.json();
      setFaqDetails((prev) => ({ ...prev, [id]: { content: data.content, keywords: data.keywords || [] } }));
    }
    setFaqLoadingId(null);
  }

  // 질문을 클릭했을 때: 이미 펼쳐진 질문을 다시 누르면 접고, 아니면 그 질문만 펼칩니다.
  function toggleFaq(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    loadFaqDetail(id);
  }

  return (
    <main>
      <SitePageHeader
        crumbs={[t("nav.home"), t(getBoardGroupKey(code)), t(`boards.tabs.${code}`)]}
        title={t(`boards.tabs.${code}`)}
        action={
          currentBoard?.allowMemberWrite && !isAdmin ? (
            <Link
              href={`/boards/${code}/write`}
              className="shrink-0 rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              {t("boards.write.pageTitleNew")}
            </Link>
          ) : undefined
        }
      />

      {code === "faq" ? (
        // '자주 묻는 질문' 게시판: 질문을 누르면 그 아래로 아코디언 형태로 답변이 펼쳐집니다.
        <div className="flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">...</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">{t("boards.list.empty")}</p>
          ) : (
            rows.map((row) => {
              const isOpen = expandedId === row.id;
              const detail = faqDetails[row.id];
              return (
                <div key={row.id}>
                  <button
                    type="button"
                    onClick={() => toggleFaq(row.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                  >
                    <span>{row.title}</span>
                    <span
                      className={`shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      ⌄
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                      {faqLoadingId === row.id && !detail ? (
                        <p className="text-xs text-neutral-400">...</p>
                      ) : (
                        <>
                          <p
                            className="min-h-[1.1rem] text-xs font-bold italic"
                            style={{ color: primaryColor || "#3b82f6" }}
                          >
                            {detail?.keywords && detail.keywords.length > 0
                              ? detail.keywords.map((k) => `#${k}`).join(" ")
                              : "\u00A0"}
                          </p>
                          <div
                            className="mt-2 text-sm leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:p-2"
                            dangerouslySetInnerHTML={{ __html: detail?.content || "" }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : isThumbnail ? (
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
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/boards/${code}/${row.id}`)}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                      {total - ((page - 1) * pageSize + idx)}
                    </td>
                    <td className="max-w-[320px] truncate px-4 py-2.5 font-medium">{row.title}</td>
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