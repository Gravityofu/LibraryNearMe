"use client";

import { useState } from "react";
import Link from "next/link";
import { MATERIAL_TYPES } from "@/lib/material-types";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CopyRow = {
  id: number | null;
  materialId: number;
  registrationNo: string | null;
  authorCode: string | null;
  specialCode: string | null;
  shelfNo: string | null;
  location: string | null;
  volume: string | null;
  copyNumber: string | null;
  status: string | null;
  hasCopy: boolean;
  material: {
    id: number;
    type: string;
    title: string;
    creator?: string;
    publisher?: string;
    pubYear?: string;
    classNumber?: string;
  };
};

type Filters = {
  type?: string;
  title?: string;
  creator?: string;
  subject?: string;
  registrationNos?: string[];
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const COLUMN_COUNT = 12;

export default function MaterialsListPage() {
  const { notify } = useNotify();
  const { t, lang } = useI18n();

  const [rows, setRows] = useState<CopyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>({});
  const [hasSearched, setHasSearched] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [showRegNo, setShowRegNo] = useState(false);

  const [detailForm, setDetailForm] = useState({ type: "", title: "", creator: "", subject: "" });
  const [regNoText, setRegNoText] = useState("");

  async function fetchList(p: number, size: number, f: Filters) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("pageSize", String(size));
    if (f.type) params.set("type", f.type);
    if (f.title) params.set("title", f.title);
    if (f.creator) params.set("creator", f.creator);
    if (f.subject) params.set("subject", f.subject);
    if (f.registrationNos && f.registrationNos.length > 0) {
      params.set("registrationNos", f.registrationNos.join(","));
    }
    const res = await fetch(`${API_URL}/copies?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
      setHasSearched(true);
    } else {
      notify("❌ " + t("materials.list.searchFail"), "error");
    }
  }

  function applyDetailSearch() {
    const f: Filters = {
      type: detailForm.type || undefined,
      title: detailForm.title || undefined,
      creator: detailForm.creator || undefined,
      subject: detailForm.subject || undefined,
    };
    setFilters(f);
    setShowDetail(false);
    fetchList(1, pageSize, f);
  }

  function applyRegNoSearch() {
    const nos = regNoText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (nos.length === 0) {
      notify("❌ " + t("materials.list.regNoEmpty"), "error");
      return;
    }
    const f: Filters = { registrationNos: nos };
    setFilters(f);
    setShowRegNo(false);
    fetchList(1, pageSize, f);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    if (hasSearched) {
      fetchList(1, size, filters);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* 상단 버튼 영역 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="cursor-pointer rounded-lg border px-3 py-2 text-sm"
        >
          {t("materials.list.detailSearch")}
        </button>
        <button
          type="button"
          onClick={() => setShowRegNo(true)}
          className="cursor-pointer rounded-lg border px-3 py-2 text-sm"
        >
          {t("materials.list.regNoSearch")}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-neutral-500">{t("materials.list.pageSizeLabel")}</span>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className="cursor-pointer rounded-lg border px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasSearched && (
        <p className="text-xs text-neutral-400">
          <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-amber-100 align-middle" />
          {t("materials.list.noCopyHint")}
        </p>
      )}

      {/* 중간 테이블 영역 (많으면 스크롤) */}
      <div className="max-h-[65vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">{t("materials.list.col.no")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.type")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.materialId")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.registrationNo")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.title")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.creator")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.publisher")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.pubYear")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.volume")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.copyNumber")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.location")}</th>
              <th className="px-4 py-2.5">{t("materials.list.col.register")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {!hasSearched &&
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                    <td key={j} className="px-4 py-2.5">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}

            {hasSearched && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-4 py-6 text-center text-neutral-400">
                  {t("materials.list.noResults")}
                </td>
              </tr>
            )}

            {hasSearched &&
              rows.map((row, i) => {
                const typeInfo = MATERIAL_TYPES.find((m) => m.code === row.material.type);
                return (
                  <tr key={row.hasCopy ? `copy-${row.id}` : `material-${row.materialId}`} className={row.hasCopy ? "" : "bg-amber-50"}>
                    <td className="whitespace-nowrap px-4 py-2.5">{(page - 1) * pageSize + i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {lang === "ko" ? typeInfo?.nameKo ?? row.material.type : typeInfo?.nameEn ?? row.material.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.materialId}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.registrationNo || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.material.title}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.material.creator || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.material.publisher || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.material.pubYear || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.volume || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.copyNumber || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{row.location || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <Link
                        href={`/admin/materials/copies?materialId=${row.materialId}`}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        {t("materials.list.registerBtn")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {hasSearched && total > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchList(page - 1, pageSize, filters)}
            className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("materials.new.pagePrev")}
          </button>
          <span className="text-neutral-500">
            {page} / {totalPages} {t("materials.pageWord")} ({t("materials.totalWord")} {total}
            {t("materials.countUnit")})
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchList(page + 1, pageSize, filters)}
            className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("materials.new.pageNext")}
          </button>
        </div>
      )}

      {/* 하단 버튼 영역 */}
      <div className="flex justify-end pt-2">
        <Link
          href="/admin/materials/new"
          className="cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
        >
          {t("materials.list.addMaterialBtn")}
        </Link>
      </div>

      {/* 상세 검색 모달 */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold">{t("materials.list.detailSearch")}</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.typeLabel")}</span>
                <select
                  value={detailForm.type}
                  onChange={(e) => setDetailForm({ ...detailForm, type: e.target.value })}
                  className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{t("materials.list.anyType")}</option>
                  {MATERIAL_TYPES.map((m) => (
                    <option key={m.code} value={m.code}>
                      {lang === "ko" ? m.nameKo ?? m.code : m.nameEn ?? m.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.title")}</span>
                <input
                  value={detailForm.title}
                  onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.creator")}</span>
                <input
                  value={detailForm.creator}
                  onChange={(e) => setDetailForm({ ...detailForm, creator: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.subject")}</span>
                <input
                  value={detailForm.subject}
                  onChange={(e) => setDetailForm({ ...detailForm, subject: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              onClick={applyDetailSearch}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("materials.search")}
            </button>
          </div>
        </div>
      )}

      {/* 등록번호 검색 모달 */}
      {showRegNo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRegNo(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm font-semibold">{t("materials.list.regNoSearch")}</p>
            <p className="mb-3 text-xs text-neutral-400">{t("materials.list.regNoHint")}</p>
            <textarea
              value={regNoText}
              onChange={(e) => setRegNoText(e.target.value)}
              rows={8}
              placeholder={"2024-0001\n2024-0002\n2024-0003"}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={applyRegNoSearch}
              className="mt-4 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("materials.search")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}