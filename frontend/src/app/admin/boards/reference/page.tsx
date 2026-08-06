"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ThemedButton from "@/components/themed-button";
import AdminBackButton from "@/components/admin-back-button";
import Pagination from "@/components/pagination";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type PostInfo = {
  id: number;
  title: string;
  content: string;
  keywords: string | null;
  materialRequest: {
    title: string;
    requestType: string;
    author: string | null;
    status: string;
  } | null;
};

type ReferenceRow = {
  id: number;
  order: number;
  kind: "MATERIAL" | "POST";
  typeLabel: string;
  title: string;
  author: string;
};

type MaterialSearchRow = {
  id: number;
  typeLabel: string;
  title: string;
  author: string;
  publisher: string;
};

type PostSearchRow = {
  id: number;
  boardName: string;
  authorName: string;
  title: string;
};

// 긴 글자를 20자에서 줄이고 뒤에 "..."을 붙입니다. (참고자료 목록을 한 줄로 보기 좋게 만들기 위함입니다.)
function truncateText(text: string, max = 20) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function AdminBoardReferencePageInner() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const searchParams = useSearchParams();

  const boardCode = searchParams.get("board") || "";
  const postId = Number(searchParams.get("postId") || 0);

  const [post, setPost] = useState<PostInfo | null>(null);
  const [references, setReferences] = useState<ReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 드래그로 순서를 바꿀 때 씁니다.
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // 추가 모달
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"material" | "post">("material");
  const [materialFilters, setMaterialFilters] = useState({ title: "", creator: "", publisher: "", subject: "" });
  const [postFilters, setPostFilters] = useState({ title: "", author: "", content: "", subject: "" });
  const [materialResults, setMaterialResults] = useState<MaterialSearchRow[]>([]);
  const [postResults, setPostResults] = useState<PostSearchRow[]>([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalPage, setModalPage] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const modalPageSize = 10;
  const modalTotalPages = Math.max(1, Math.ceil(modalTotal / modalPageSize));

  async function loadPost() {
    if (!postId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      setPost(await res.json());
    } else {
      notify("❌ " + t("boards.write.loadFail"), "error");
    }
  }

  async function loadReferences() {
    if (!postId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/post-references?postId=${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setReferences(await res.json());
    } else {
      notify("❌ " + t("boards.reference.loadFail"), "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPost();
    loadReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const keywordList = post?.keywords ? post.keywords.split(",").map((w) => w.trim()).filter(Boolean) : [];

  // --- 드래그로 순서 바꾸기 ---
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: any) {
    e.preventDefault();
  }

  async function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const next = [...references];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setReferences(next);
    setDragIndex(null);

    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/post-references/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId, orderedIds: next.map((r) => r.id) }),
    });
    if (res.ok) {
      notify("✅ " + t("boards.reference.reorderSuccess"), "success");
    } else {
      notify("❌ " + t("boards.reference.reorderFail"), "error");
      loadReferences();
    }
  }

  // --- 제외(목록에서 빼기) ---
  async function handleExclude(id: number) {
    if (!window.confirm(t("boards.reference.excludeConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/post-references/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("boards.reference.excludeSuccess"), "success");
      loadReferences();
    } else {
      notify("❌ " + t("boards.reference.excludeFail"), "error");
    }
  }

  // --- 모달: 검색 ---
  async function loadMaterialResults(page: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    setModalLoading(true);
    const params = new URLSearchParams();
    if (materialFilters.title) params.set("title", materialFilters.title);
    if (materialFilters.creator) params.set("creator", materialFilters.creator);
    if (materialFilters.publisher) params.set("publisher", materialFilters.publisher);
    if (materialFilters.subject) params.set("subject", materialFilters.subject);
    params.set("page", String(page));
    const res = await fetch(`${API_URL}/materials/for-reference?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMaterialResults(data.items);
      setModalTotal(data.total);
      setModalPage(page);
    }
    setModalLoading(false);
  }

  async function loadPostResults(page: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    setModalLoading(true);
    const params = new URLSearchParams();
    if (postFilters.title) params.set("title", postFilters.title);
    if (postFilters.author) params.set("author", postFilters.author);
    if (postFilters.content) params.set("content", postFilters.content);
    if (postFilters.subject) params.set("subject", postFilters.subject);
    params.set("excludePostId", String(postId));
    params.set("page", String(page));
    const res = await fetch(`${API_URL}/posts/for-reference?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPostResults(data.items);
      setModalTotal(data.total);
      setModalPage(page);
    }
    setModalLoading(false);
  }

  function runModalSearch() {
    if (modalTab === "material") {
      loadMaterialResults(1);
    } else {
      loadPostResults(1);
    }
  }

  function openModal() {
    setModalTab("material");
    setMaterialFilters({ title: "", creator: "", publisher: "", subject: "" });
    setPostFilters({ title: "", author: "", content: "", subject: "" });
    setShowModal(true);
    loadMaterialResults(1);
  }

  function switchModalTab(tab: "material" | "post") {
    setModalTab(tab);
    if (tab === "material") {
      loadMaterialResults(1);
    } else {
      loadPostResults(1);
    }
  }

  function goToModalPage(p: number) {
    if (modalTab === "material") {
      loadMaterialResults(p);
    } else {
      loadPostResults(p);
    }
  }

  // --- 모달: 등록 ---
  async function registerMaterial(materialId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/post-references`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId, materialId }),
    });
    if (res.ok) {
      notify("✅ " + t("boards.reference.modal.registerSuccess"), "success");
      setShowModal(false);
      loadReferences();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.reference.modal.registerFail")), "error");
    }
  }

  async function registerPost(referencedPostId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/post-references`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId, referencedPostId }),
    });
    if (res.ok) {
      notify("✅ " + t("boards.reference.modal.registerSuccess"), "success");
      setShowModal(false);
      loadReferences();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.reference.modal.registerFail")), "error");
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-neutral-400">...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("boards.reference.pageTitle")}</h1>
        <AdminBackButton href={`/admin/boards?board=${boardCode}`} />
      </div>

      {/* 글 정보 - 보기 전용입니다. 여기서는 수정할 수 없습니다. */}
      {post && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3">
            <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.title")}</span>
            <p className="text-sm font-medium">{post.title}</p>
          </div>

          <div className="mb-3">
            <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.keywords")}</span>
            {keywordList.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {keywordList.map((k) => (
                  <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    #{k}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-300">-</p>
            )}
          </div>

          {post.materialRequest && (
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.materialTitle")}</span>
                <p className="text-sm">{post.materialRequest.title}</p>
              </div>
              <div>
                <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.requestType")}</span>
                <p className="text-sm">{post.materialRequest.requestType}</p>
              </div>
              <div>
                <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.requestAuthor")}</span>
                <p className="text-sm">{post.materialRequest.author || "-"}</p>
              </div>
              <div>
                <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.status")}</span>
                <p className="text-sm">{t(`boards.status.${post.materialRequest.status}`)}</p>
              </div>
            </div>
          )}

          <div>
            <span className="mb-1 block text-xs text-neutral-400">{t("boards.write.field.content")}</span>
            <div
              className="min-h-[80px] rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>
      )}

      {/* 참고자료 목록 */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">{t("boards.reference.sectionTitle")}</h2>
        <ThemedButton preset="버튼1" onClick={openModal}>
          {t("boards.reference.addBtn")}
        </ThemedButton>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="w-10 px-4 py-2.5"></th>
              <th className="px-4 py-2.5">{t("boards.reference.col.no")}</th>
              <th className="px-4 py-2.5">{t("boards.reference.col.type")}</th>
              <th className="px-4 py-2.5">{t("boards.reference.col.title")}</th>
              <th className="px-4 py-2.5">{t("boards.reference.col.author")}</th>
              <th className="px-4 py-2.5">{t("boards.list.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {references.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  {t("boards.reference.empty")}
                </td>
              </tr>
            ) : (
              references.map((row, idx) => (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`cursor-move select-none ${dragIndex === idx ? "opacity-40" : ""}`}
                >
                  <td className="px-4 py-2.5 text-center text-neutral-300">⠿⠿</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{idx + 1}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500" title={row.typeLabel}>
                    {truncateText(row.typeLabel)}
                  </td>
                  <td className="max-w-[240px] px-4 py-2.5 font-medium" title={row.title}>
                    {truncateText(row.title)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500" title={row.author}>
                    {truncateText(row.author)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleExclude(row.id)}
                      className="cursor-pointer rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      {t("boards.reference.excludeBtn")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 추가 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-neutral-100 p-5">
              <p className="mb-3 text-sm font-semibold">{t("boards.reference.modal.title")}</p>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => switchModalTab("material")}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium ${
                    modalTab === "material"
                      ? "border-[#383838] bg-[#383838] text-[#F9F6F0]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t("boards.reference.modal.tabMaterial")}
                </button>
                <button
                  type="button"
                  onClick={() => switchModalTab("post")}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium ${
                    modalTab === "post"
                      ? "border-[#383838] bg-[#383838] text-[#F9F6F0]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t("boards.reference.modal.tabPost")}
                </button>
              </div>

              {modalTab === "material" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    value={materialFilters.title}
                    onChange={(e) => setMaterialFilters({ ...materialFilters, title: e.target.value })}
                    placeholder={t("boards.reference.modal.search.title")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={materialFilters.creator}
                    onChange={(e) => setMaterialFilters({ ...materialFilters, creator: e.target.value })}
                    placeholder={t("boards.reference.modal.search.creator")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={materialFilters.publisher}
                    onChange={(e) => setMaterialFilters({ ...materialFilters, publisher: e.target.value })}
                    placeholder={t("boards.reference.modal.search.publisher")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={materialFilters.subject}
                    onChange={(e) => setMaterialFilters({ ...materialFilters, subject: e.target.value })}
                    placeholder={t("boards.reference.modal.search.subject")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    value={postFilters.title}
                    onChange={(e) => setPostFilters({ ...postFilters, title: e.target.value })}
                    placeholder={t("boards.reference.modal.search.title")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={postFilters.author}
                    onChange={(e) => setPostFilters({ ...postFilters, author: e.target.value })}
                    placeholder={t("boards.reference.modal.search.author")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={postFilters.content}
                    onChange={(e) => setPostFilters({ ...postFilters, content: e.target.value })}
                    placeholder={t("boards.reference.modal.search.content")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={postFilters.subject}
                    onChange={(e) => setPostFilters({ ...postFilters, subject: e.target.value })}
                    placeholder={t("boards.reference.modal.search.subject")}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={runModalSearch}
                  className="cursor-pointer rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  {t("boards.reference.modal.search.searchBtn")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-500">
                  {modalTab === "material" ? (
                    <tr>
                      <th className="px-3 py-2">{t("boards.reference.col.no")}</th>
                      <th className="px-3 py-2">{t("boards.reference.col.type")}</th>
                      <th className="px-3 py-2">{t("boards.reference.col.title")}</th>
                      <th className="px-3 py-2">{t("boards.reference.modal.search.creator")}</th>
                      <th className="px-3 py-2">{t("boards.reference.modal.search.publisher")}</th>
                      <th className="px-3 py-2">{t("boards.list.col.action")}</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-3 py-2">{t("boards.reference.col.no")}</th>
                      <th className="px-3 py-2">{t("boards.reference.modal.boardName")}</th>
                      <th className="px-3 py-2">{t("boards.list.col.author")}</th>
                      <th className="px-3 py-2">{t("boards.reference.col.title")}</th>
                      <th className="px-3 py-2">{t("boards.list.col.action")}</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {modalLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-neutral-400">
                        ...
                      </td>
                    </tr>
                  ) : modalTab === "material" ? (
                    materialResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-neutral-400">
                          {t("boards.reference.modal.empty")}
                        </td>
                      </tr>
                    ) : (
                      materialResults.map((m, idx) => (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                            {(modalPage - 1) * modalPageSize + idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{m.typeLabel}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 font-medium">{m.title}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{m.author || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{m.publisher || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <button
                              type="button"
                              onClick={() => registerMaterial(m.id)}
                              className="cursor-pointer rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                            >
                              {t("boards.reference.modal.registerBtn")}
                            </button>
                          </td>
                        </tr>
                      ))
                    )
                  ) : postResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                        {t("boards.reference.modal.empty")}
                      </td>
                    </tr>
                  ) : (
                    postResults.map((p, idx) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                          {(modalPage - 1) * modalPageSize + idx + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{p.boardName}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{p.authorName}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 font-medium">{p.title}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            onClick={() => registerPost(p.id)}
                            className="cursor-pointer rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                          >
                            {t("boards.reference.modal.registerBtn")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="mt-4">
                <Pagination page={modalPage} totalPages={modalTotalPages} onPageChange={goToModalPage} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminBoardReferencePage() {
  return (
    <Suspense fallback={null}>
      <AdminBoardReferencePageInner />
    </Suspense>
  );
}