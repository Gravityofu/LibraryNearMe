"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MATERIAL_TYPES } from "@/lib/material-types";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";
import AdminBackButton from "@/components/admin-back-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CopyItem = {
  id: number;
  registrationNo: string;
  callNumber?: string;
  authorCode?: string;
  specialCode?: string;
  shelfNo?: string;
  location?: string;
  memo?: string;
  status: string;
  volume?: string;
  copyNumber?: string;
};

type MaterialFull = {
  id: number;
  type: string;
  title: string;
  creator?: string;
  publisher?: string;
  pubYear?: string;
  classNumber?: string;
  marc?: MarcField[];
  copies: CopyItem[];
};

const EMPTY_FORM = {
  registrationNo: "",
  callNumber: "",
  authorCode: "",
  specialCode: "",
  shelfNo: "",
  location: "",
  memo: "",
  status: "AVAILABLE",
  volume: "",
  copyNumber: "",
};

const STATUS_OPTIONS = [
  { value: "AVAILABLE", labelKey: "materials.copies.status.available" },
  { value: "ON_LOAN", labelKey: "materials.copies.status.onLoan" },
  { value: "RESERVED", labelKey: "materials.copies.status.reserved" },
  { value: "REPAIR", labelKey: "materials.copies.status.repair" },
  { value: "LOST", labelKey: "materials.copies.status.lost" },
  { value: "WITHDRAWN", labelKey: "materials.copies.status.withdrawn" },
];

// MARC 목록에서 090 태그의 ▼b(저자기호)를 찾아옵니다.
function findAuthorCode(marc?: { tag: string; value: string }[]) {
  const field = marc?.find((f) => f.tag === "090");
  if (!field) return "";
  const part = field.value.split("▼").find((p) => p.startsWith("b"));
  return part ? part.slice(1).trim() : "";
}

function CopiesPageInner() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get("materialId");

  const { notify } = useNotify();
  const { t } = useI18n();

  const [material, setMaterial] = useState<MaterialFull | null>(null);
  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [latestRegNo, setLatestRegNo] = useState<string | null>(null);

  async function loadMaterial(id: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMaterial(data);
      setMarc(Array.isArray(data.marc) && data.marc.length > 0 ? data.marc : DEFAULT_FIELDS);
      setForm({ ...EMPTY_FORM, authorCode: findAuthorCode(data.marc) });
      setSelectedCopyId(null);
    } else {
      notify("❌ " + t("materials.copies.loadFail"), "error");
    }
  }

  async function refreshMaterial(id: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMaterial(await res.json());
    }
  }

  async function loadLatestRegNo() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copies/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLatestRegNo(data.registrationNo);
    }
  }

  useEffect(() => {
    if (materialId) loadMaterial(materialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  useEffect(() => {
    loadLatestRegNo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectCopy(copy: CopyItem) {
    setSelectedCopyId(copy.id);
    setForm({
      registrationNo: copy.registrationNo,
      callNumber: copy.callNumber || "",
      authorCode: copy.authorCode || "",
      specialCode: copy.specialCode || "",
      shelfNo: copy.shelfNo || "",
      location: copy.location || "",
      memo: copy.memo || "",
      status: copy.status || "AVAILABLE",
      volume: copy.volume || "",
      copyNumber: copy.copyNumber || "",
    });
  }

  function resetForm() {
    setSelectedCopyId(null);
    setForm({ ...EMPTY_FORM, authorCode: findAuthorCode(marc) });
  }

  async function handleSaveMarc() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${material.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ marc }),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.marcSaveSuccess"), "success");
      await refreshMaterial(material.id);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.marcSaveFail")), "error");
    }
  }

  async function handleAddCopy() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.registrationNo.trim()) {
      notify("❌ " + t("materials.copies.regNoRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/materials/${material.id}/copies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.addSuccess"), "success");
      await refreshMaterial(material.id);
      await loadLatestRegNo();
      resetForm();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.addFail")), "error");
    }
  }

  async function handleUpdateCopy() {
    if (!selectedCopyId || !material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.registrationNo.trim()) {
      notify("❌ " + t("materials.copies.regNoRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/copies/${selectedCopyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.updateSuccess"), "success");
      await refreshMaterial(material.id);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.updateFail")), "error");
    }
  }

  if (!materialId) {
    return (
      <div className="p-6">
        <p className="text-sm text-neutral-500">{t("materials.copies.noMaterialSelected")}</p>
        <Link
          href="/admin/materials/list"
          className="mt-3 inline-block cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
        >
          {t("materials.copies.goToList")}
        </Link>
      </div>
    );
  }

  if (!material) {
    return <p className="p-6 text-sm text-neutral-400">{t("materials.copies.loading")}</p>;
  }

  const typeInfo = MATERIAL_TYPES.find((m) => m.code === material.type);
  const usesMarc = typeInfo?.usesMarc ?? false;

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold">{material.title}</h1>
        <AdminBackButton href="/admin/materials/list" />
      </div>
      <p className="mb-4 text-sm text-neutral-400">
        {material.creator || "-"} · {material.classNumber || "-"}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 왼쪽 열 */}
        <div className="flex flex-col gap-4">
          {/* 왼쪽 위: MARC 편집기(또는 비도서 요약) */}
          <div className="max-h-[45vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">{t("materials.copies.marcBoxTitle")}</p>
            {usesMarc ? (
              <>
                <MarcEditor fields={marc} onChange={setMarc} />
                <button
                  type="button"
                  onClick={handleSaveMarc}
                  className="mt-3 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                  {t("materials.copies.marcEditSave")}
                </button>
              </>
            ) : (
              <div className="space-y-1 text-sm text-neutral-600">
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.title")}: </span>
                  {material.title}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.creator")}: </span>
                  {material.creator || "-"}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.publisher")}: </span>
                  {material.publisher || "-"}
                </p>
                <p>
                  <span className="text-neutral-400">{t("materials.new.field.pubYear")}: </span>
                  {material.pubYear || "-"}
                </p>
              </div>
            )}
          </div>

          {/* 왼쪽 아래: 기존 실물 목록(스크롤, 표) */}
          <div className="max-h-[35vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">
              {t("materials.copies.copyListHeading")} ({material.copies.length}
              {t("materials.copies.countUnitBooks")})
            </p>
            {material.copies.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-2 py-1.5">{t("materials.copies.regNo")}</th>
                    <th className="px-2 py-1.5">{t("materials.copies.callNumber")}</th>
                    <th className="px-2 py-1.5">{t("materials.copies.location")}</th>
                    <th className="px-2 py-1.5">{t("materials.copies.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {material.copies.map((c) => {
                    const statusOpt = STATUS_OPTIONS.find((s) => s.value === c.status);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => selectCopy(c)}
                        className={`cursor-pointer ${
                          selectedCopyId === c.id ? "bg-neutral-100" : "hover:bg-neutral-50"
                        }`}
                      >
                        <td className="whitespace-nowrap px-2 py-2">{c.registrationNo}</td>
                        <td className="whitespace-nowrap px-2 py-2">{c.callNumber || "-"}</td>
                        <td className="whitespace-nowrap px-2 py-2">{c.location || "-"}</td>
                        <td className="whitespace-nowrap px-2 py-2">
                          {statusOpt ? t(statusOpt.labelKey) : c.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-neutral-400">{t("materials.copies.noCopies")}</p>
            )}
          </div>

        </div>

        {/* 오른쪽: 등록/수정 폼 */}
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {selectedCopyId ? t("materials.copies.editHeading") : t("materials.copies.addHeading")}
            </p>
            {selectedCopyId && (
              <button
                type="button"
                onClick={resetForm}
                className="cursor-pointer text-xs text-neutral-400 underline"
              >
                {t("materials.copies.newEntry")}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">
                {t("materials.copies.regNo")} *
                {latestRegNo && (
                  <span className="ml-2 text-xs text-neutral-400">
                    ({t("materials.copies.latestRegNo")}: {latestRegNo})
                  </span>
                )}
              </span>
              <input
                value={form.registrationNo}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.callNumber")}</span>
              <input
                value={form.callNumber}
                onChange={(e) => setForm({ ...form, callNumber: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.authorCode")}</span>
              <input
                value={form.authorCode}
                onChange={(e) => setForm({ ...form, authorCode: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.volume")}</span>
              <input
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                placeholder="예: v.1"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.copyNumber")}</span>
              <input
                value={form.copyNumber}
                onChange={(e) => setForm({ ...form, copyNumber: e.target.value })}
                placeholder="예: c.1"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.status")}</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.specialCode")}</span>
              <input
                value={form.specialCode}
                onChange={(e) => setForm({ ...form, specialCode: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.shelfNo")}</span>
              <input
                value={form.shelfNo}
                onChange={(e) => setForm({ ...form, shelfNo: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.location")}</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.memo")}</span>
              <input
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleUpdateCopy}
              disabled={!selectedCopyId}
              className="flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("materials.copies.update")}
            </button>
            <button
              type="button"
              onClick={handleAddCopy}
              className="flex-1 cursor-pointer rounded-lg bg-[#383838] px-4 py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("materials.copies.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaterialCopiesPage() {
  return (
    <Suspense fallback={null}>
      <CopiesPageInner />
    </Suspense>
  );
}