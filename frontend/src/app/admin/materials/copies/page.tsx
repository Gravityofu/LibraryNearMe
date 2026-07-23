"use client";

import { useState } from "react";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MaterialSummary = {
  id: number;
  type: string;
  title: string;
  creator?: string;
  classNumber?: string;
  marc?: { tag: string; value: string }[]; // 090 ▼b를 찾기 위해 필요
};

type Copy = {
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

const EMPTY_COPY = {
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

export default function MaterialCopiesPage() {
  const { notify } = useNotify();
  const { t } = useI18n();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<MaterialSummary[]>([]);
  const [selected, setSelected] = useState<(MaterialSummary & { copies: Copy[] }) | null>(null);
  const [form, setForm] = useState(EMPTY_COPY);

  // MARC 목록에서 090 태그의 ▼b(저자기호)를 찾아옵니다.
  function findAuthorCode(marc?: { tag: string; value: string }[]) {
    const field = marc?.find((f) => f.tag === "090");
    if (!field) return "";
    const part = field.value.split("▼").find((p) => p.startsWith("b"));
    return part ? part.slice(1).trim() : "";
  }

  async function search() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials?search=${encodeURIComponent(keyword)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setResults(await res.json());
    } else {
      notify("❌ " + t("materials.copies.searchFail"), "error");
    }
  }

  async function selectMaterial(id: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelected(data);
      setForm({ ...EMPTY_COPY, authorCode: findAuthorCode(data.marc) });
    } else {
      notify("❌ " + t("materials.copies.loadFail"), "error");
    }
  }

  async function addCopy() {
    if (!selected) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.registrationNo.trim()) {
      notify("❌ " + t("materials.copies.regNoRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/materials/${selected.id}/copies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.addSuccess"), "success");
      selectMaterial(selected.id); // 부수 목록 새로고침 + 폼 초기화(저자기호는 다시 자동 채움)
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.addFail")), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-bold">{t("materials.copies.title")}</h1>

      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">{t("materials.copies.searchHeading")}</p>
        <div className="flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={t("materials.searchPlaceholderTitleAuthor")}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => search()}
            className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
          >
            {t("materials.search")}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-200">
            {results.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <div className="text-sm">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-neutral-400">
                    {m.creator} · {m.classNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectMaterial(m.id)}
                  className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                >
                  {t("materials.copies.select")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <p className="mb-1 text-sm font-semibold">{selected.title}</p>
          <p className="mb-3 text-sm text-neutral-400">
            {selected.creator} · {selected.classNumber}
          </p>

          <p className="mb-2 text-sm font-semibold">
            {t("materials.copies.copyListHeading")} ({selected.copies.length}
            {t("materials.copies.countUnitBooks")})
          </p>
          {selected.copies.length > 0 ? (
            <ul className="mb-4 divide-y divide-neutral-200 text-sm">
              {selected.copies.map((c) => (
                <li key={c.id} className="py-2">
                  {t("materials.copies.regNo")} {c.registrationNo} · {t("materials.copies.callNumber")}{" "}
                  {c.callNumber || "-"} · {c.authorCode || "-"} · {c.volume || "-"} · {c.copyNumber || "-"} ·{" "}
                  {c.location || "-"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-neutral-400">{t("materials.copies.noCopies")}</p>
          )}

          <p className="mb-2 text-sm font-semibold">{t("materials.copies.addHeading")}</p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.authorCode")}</span>
              <input
                value={form.authorCode}
                onChange={(e) => setForm({ ...form, authorCode: e.target.value })}
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

          <button
            onClick={addCopy}
            className="mt-4 cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
          >
            {t("materials.copies.add")}
          </button>
        </div>
      )}
    </div>
  );
}