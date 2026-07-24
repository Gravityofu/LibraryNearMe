"use client";

import { useState } from "react";
import { MATERIAL_TYPES } from "@/lib/material-types";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";
import AdminBackButton from "@/components/admin-back-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SIMPLE_FIELDS = [
  { key: "title", labelKey: "materials.new.field.title", required: true },
  { key: "creator", labelKey: "materials.new.field.creator" },
  { key: "publisher", labelKey: "materials.new.field.publisher" },
  { key: "pubYear", labelKey: "materials.new.field.pubYear" },
  { key: "isbn", labelKey: "materials.new.field.isbn" },
  { key: "classNumber", labelKey: "materials.new.field.classNumber" },
  { key: "format", labelKey: "materials.new.field.format" },
  { key: "subject", labelKey: "materials.new.field.subject" },
  { key: "language", labelKey: "materials.new.field.language" },
  { key: "summary", labelKey: "materials.new.field.summary" },
];

export default function NewMaterialPage() {
  const { notify } = useNotify();
  const { t, lang } = useI18n();

  const [type, setType] = useState("book");
  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState<Record<string, string>>({});
  const [marcRaw, setMarcRaw] = useState<string | undefined>(undefined);

  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<
    { recKey: string; title?: string; author?: string; publisher?: string; pubYear?: string; libName?: string }[]
  >([]);
  const [kolisLoading, setKolisLoading] = useState(false);
  const [kolisPage, setKolisPage] = useState(1);
  const [kolisTotal, setKolisTotal] = useState(0);

  const selected = MATERIAL_TYPES.find((m) => m.code === type);
  const usesMarc = selected?.usesMarc ?? false;

  // "<b>노랜드</b> : 천선란 소설집" → "노랜드"만 굵게 표시
  function renderTitle(title?: string) {
    if (!title) return null;
    const parts = title.split(/<b>(.*?)<\/b>/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  }

  // <b> 태그는 지우고, 15자 넘으면 잘라내고 "..." 붙이기
  function truncate(text?: string, max = 15) {
    if (!text) return "";
    const plain = text.replace(/<\/?b>/gi, "");
    return plain.length > max ? plain.slice(0, max) + "..." : plain;
  }

  async function searchKolis(page = 1) {
    const token = localStorage.getItem("token");
    if (!kolisKeyword.trim() || !token) return;
    setKolisLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/materials/kolis-search?keyword=${encodeURIComponent(kolisKeyword)}&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setKolisResults(data.items);
        setKolisTotal(data.total);
        setKolisPage(data.page);
      } else {
        notify("❌ " + t("materials.new.kolisSearchFail"), "error");
      }
    } finally {
      setKolisLoading(false);
    }
  }

  async function importKolis(recKey: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/kolis-marc?recKey=${recKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMarc(data.marc);
      setMarcRaw(data.raw);
      notify("✅ " + t("materials.new.importSuccess"), "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.new.importFail")), "error");
    }
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) {
      notify("❌ " + t("materials.new.loginRequired"), "error");
      return;
    }

    const body = usesMarc ? { type, marc, marcRaw } : { type, ...form };

    const res = await fetch(`${API_URL}/materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      notify("✅ " + t("materials.new.saveSuccess"), "success");
      setForm({});
      setMarc(DEFAULT_FIELDS);
      setMarcRaw(undefined);
      setKolisResults([]);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.new.saveFail")), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("materials.new.title")}</h1>
        <AdminBackButton href="/admin/materials/list" />
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.typeLabel")}</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-48 cursor-pointer rounded-lg border px-3 py-2 text-sm"
        >
          {MATERIAL_TYPES.map((m) => (
            <option key={m.code} value={m.code}>
              {lang === "ko" ? m.nameKo ?? m.code : m.nameEn ?? m.code}
            </option>
          ))}
        </select>
      </label>

      {usesMarc ? (
        <div>
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">{t("materials.new.kolisHeading")}</p>
            <div className="flex gap-2">
              <input
                value={kolisKeyword}
                onChange={(e) => setKolisKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchKolis()}
                placeholder={t("materials.searchPlaceholderTitleAuthor")}
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => searchKolis()}
                className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
              >
                {t("materials.search")}
              </button>
            </div>

            {kolisLoading && <p className="mt-2 text-sm text-neutral-400">{t("materials.searching")}</p>}

            {kolisResults.length > 0 && (
              <ul className="mt-3 divide-y divide-neutral-200">
                {kolisResults.map((r) => (
                  <li key={r.recKey} className="flex items-center justify-between gap-2 py-2">
                    <div className="text-sm">
                      <p className="font-medium">{renderTitle(r.title)}</p>
                      <p className="text-neutral-400">
                        {truncate(r.author)} · {truncate(r.publisher)} · {truncate(r.pubYear)} ·{" "}
                        {truncate(r.libName)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => importKolis(r.recKey)}
                      className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                    >
                      {t("materials.new.kolisImport")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {kolisTotal > 10 && (
              <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={kolisPage <= 1}
                  onClick={() => searchKolis(kolisPage - 1)}
                  className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("materials.new.pagePrev")}
                </button>
                <span className="text-neutral-500">
                  {kolisPage} / {Math.ceil(kolisTotal / 10)} {t("materials.pageWord")} ({t("materials.totalWord")}{" "}
                  {kolisTotal}
                  {t("materials.countUnit")})
                </span>
                <button
                  type="button"
                  disabled={kolisPage >= Math.ceil(kolisTotal / 10)}
                  onClick={() => searchKolis(kolisPage + 1)}
                  className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("materials.new.pageNext")}
                </button>
              </div>
            )}
          </div>

          <p className="mb-2 text-sm text-neutral-500">{t("materials.new.marcHint")}</p>
          <MarcEditor fields={marc} onChange={setMarc} />
        </div>
      ) : (
        <div className="space-y-3">
          {SIMPLE_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-neutral-500">
                {t(f.labelKey)}
                {f.required && " *"}
              </span>
              <input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        className="mt-5 cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
      >
        {t("materials.new.save")}
      </button>
    </div>
  );
}