"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
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

type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  category: "PHYSICAL" | "DIGITAL";
  usesMarc: boolean;
};

export default function NewMaterialPage() {
  const { notify } = useNotify();
  const { t, lang } = useI18n();

  // 자료 종류 목록 — 서버(관리자가 설정에서 관리하는 목록)에서 가져와요.
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  // 등록 화면의 진행 단계: "category"(1단계) → "subtype"(2단계) → "form"(실제 입력폼)
  const [step, setStep] = useState<"category" | "subtype" | "form">("category");
  const [category, setCategory] = useState<"PHYSICAL" | "DIGITAL" | null>(null);
  const [type, setType] = useState("");

  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState<Record<string, string>>({});
  const [marcRaw, setMarcRaw] = useState<string | undefined>(undefined);

  // 주제어는 한 칸이 아니라, 단어 하나마다 칸이 하나씩 생기는 방식이라 별도 배열로 관리해요.
  const [subjectWords, setSubjectWords] = useState<string[]>([""]);
  const [maxSubjectKeywords, setMaxSubjectKeywords] = useState(10);
  const subjectInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<
    { recKey: string; title?: string; author?: string; publisher?: string; pubYear?: string; libName?: string }[]
  >([]);
  const [kolisLoading, setKolisLoading] = useState(false);
  const [kolisPage, setKolisPage] = useState(1);
  const [kolisTotal, setKolisTotal] = useState(0);

  const [showTagHelp, setShowTagHelp] = useState(false);
  const [tagHelpList, setTagHelpList] = useState<
    { id: number; tag: string; fieldName: string; indicators?: string; subfieldCodes?: string; example?: string }[]
  >([]);

  async function loadMaterialTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMaterialTypes(await res.json());
    } else {
      notify("❌ " + t("materials.new.step.loadFail"), "error");
    }
  }

  // 주제어 최대 개수는 로그인 없이도 볼 수 있는 도서관 공개 정보(GET /library)에서 가져와요.
  async function loadMaxSubjectKeywords() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      if (data?.maxSubjectKeywords) {
        setMaxSubjectKeywords(data.maxSubjectKeywords);
      }
    }
  }

  useEffect(() => {
    loadMaterialTypes();
    loadMaxSubjectKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = materialTypes.find((m) => m.code === type);
  const usesMarc = selected?.usesMarc ?? false;

  function chooseCategory(cat: "PHYSICAL" | "DIGITAL") {
    setCategory(cat);
    setStep("subtype");
  }

  function chooseType(code: string) {
    setType(code);
    setStep("form");
  }

  function backToCategory() {
    setStep("category");
    setCategory(null);
    setType("");
  }

  function backToSubtype() {
    setStep("subtype");
    setType("");
  }

  // 주제어 칸 하나의 내용이 바뀔 때
  function updateSubjectWord(index: number, value: string) {
    setSubjectWords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  // 주제어 칸에서 스페이스바를 누르면 다음 칸을 만들고, 빈 칸에서 백스페이스를 누르면 그 칸을 지워요.
  function handleSubjectKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === " ") {
      e.preventDefault(); // 스페이스가 글자로 들어가지 않도록 막아요.
      const isLast = index === subjectWords.length - 1;
      const hasText = subjectWords[index].trim().length > 0;
      if (isLast && hasText && subjectWords.length < maxSubjectKeywords) {
        setSubjectWords((prev) => [...prev, ""]);
        setTimeout(() => subjectInputRefs.current[index + 1]?.focus(), 0);
      }
    } else if (e.key === "Backspace" && subjectWords[index] === "" && index > 0) {
      e.preventDefault();
      setSubjectWords((prev) => prev.filter((_, i) => i !== index));
      setTimeout(() => subjectInputRefs.current[index - 1]?.focus(), 0);
    }
  }

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

  async function openTagHelp() {
    setShowTagHelp(true);
    if (tagHelpList.length > 0) return; // 이미 불러왔으면 다시 안 불러옴
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/settings/kormarc-tags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTagHelpList(await res.json());
    }
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) {
      notify("❌ " + t("materials.new.loginRequired"), "error");
      return;
    }

    const subjectValue = subjectWords.map((w) => w.trim()).filter(Boolean).join(",");

    const body = usesMarc
      ? { type, marc, marcRaw, coverUrl: form.coverUrl }
      : { type, ...form, subject: subjectValue };

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
      setSubjectWords([""]);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.new.saveFail")), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("materials.new.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openTagHelp}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            {t("materials.new.tagHelpBtn")}
          </button>
          {step === "category" && <AdminBackButton href="/admin/materials/list" />}
          {step === "subtype" && <AdminBackButton onClick={backToCategory} />}
          {step === "form" && <AdminBackButton onClick={backToSubtype} />}
        </div>
      </div>

      {step === "category" && (
        <div>
          <p className="mb-3 text-sm font-semibold">{t("materials.new.step.categoryTitle")}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => chooseCategory("PHYSICAL")}
              className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-6 text-center hover:bg-neutral-50"
            >
              <p className="text-base font-semibold">{t("materials.new.step.categoryPhysical")}</p>
            </button>
            <button
              type="button"
              onClick={() => chooseCategory("DIGITAL")}
              className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-6 text-center hover:bg-neutral-50"
            >
              <p className="text-base font-semibold">{t("materials.new.step.categoryDigital")}</p>
            </button>
          </div>
        </div>
      )}

      {step === "subtype" && (
        <div>
          <p className="mb-3 text-sm font-semibold">{t("materials.new.step.subtypeTitle")}</p>


          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {materialTypes
              .filter((m) => m.category === category)
              .map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => chooseType(m.code)}
                  className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
                >
                  {lang === "ko" ? m.nameKo : m.nameEn}
                </button>
              ))}
          </div>
        </div>
      )}

      {step === "form" && selected && (
        <div>
          <p className="mb-4 text-sm font-semibold">
            {t("materials.new.typeLabel")}: {lang === "ko" ? selected.nameKo : selected.nameEn}
          </p>

          <div className="mb-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.coverUrl")}</span>
              <input
                value={form.coverUrl ?? ""}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            {selected.category === "DIGITAL" && (
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.onlineUrl")}</span>
                <input
                  value={form.onlineUrl ?? ""}
                  onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            )}
          </div>

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
                            {[truncate(r.author), truncate(r.publisher), truncate(r.pubYear), truncate(r.libName)]
                              .filter(Boolean)
                              .join(" · ")}
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
              {SIMPLE_FIELDS.map((f) => {
                if (f.key === "subject") {
                  return (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-sm text-neutral-500">
                        {t(f.labelKey)} ({subjectWords.filter((w) => w.trim()).length}/{maxSubjectKeywords})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {subjectWords.map((word, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              subjectInputRefs.current[i] = el;
                            }}
                            value={word}
                            onChange={(e) => updateSubjectWord(i, e.target.value)}
                            onKeyDown={(e) => handleSubjectKeyDown(e, i)}
                            className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{t("materials.new.subjectHint")}</p>
                    </label>
                  );
                }
                return (
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
                );
              })}
            </div>
          )}

          <button
            onClick={handleSave}
            className="mt-5 cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
          >
            {t("materials.new.save")}
          </button>
        </div>
      )}

      {showTagHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowTagHelp(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("materials.new.tagHelpTitle")}</p>
              <a
                href="https://librarian.nl.go.kr/kormarc/KSX6006-0/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold"
              >
                {t("materials.new.tagHelpMore")}
              </a>
            </div>
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.tags.col.tag")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.fieldName")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.indicators")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.subfieldCodes")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.example")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tagHelpList.map((tag) => (
                  <tr key={tag.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{tag.tag}</td>
                    <td className="whitespace-nowrap px-3 py-2">{tag.fieldName}</td>
                    <td className="px-3 py-2 text-neutral-500">{tag.indicators || "-"}</td>
                    <td className="px-3 py-2 text-neutral-500">{tag.subfieldCodes || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{tag.example || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}