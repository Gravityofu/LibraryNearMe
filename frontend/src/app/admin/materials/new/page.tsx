"use client";

import { useState } from "react";
import { MATERIAL_TYPES } from "@/lib/material-types";
import { useNotify } from "@/components/notify-provider";
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// 비도서 간단 폼에서 쓰는 칸들
const SIMPLE_FIELDS = [
  { key: "title", label: "제목", required: true },
  { key: "creator", label: "저자·제작자" },
  { key: "publisher", label: "발행처" },
  { key: "pubYear", label: "발행년" },
  { key: "isbn", label: "ISBN·식별번호" },
  { key: "classNumber", label: "분류기호" },
  { key: "format", label: "형태" },
  { key: "subject", label: "주제어" },
  { key: "language", label: "언어" },
  { key: "summary", label: "설명" },
];

export default function NewMaterialPage() {
  const { notify } = useNotify();

  const [type, setType] = useState("book");

  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<
    { recKey: string; title?: string; author?: string; publisher?: string; pubYear?: string; libName?: string }[]
  >([]);

  const [kolisPage, setKolisPage] = useState(1);
  const [kolisTotal, setKolisTotal] = useState(0);

  const [kolisLoading, setKolisLoading] = useState(false);
  const [marcRaw, setMarcRaw] = useState<string | undefined>(undefined);

  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState<Record<string, string>>({});

  const selected = MATERIAL_TYPES.find((m) => m.code === type);
  const usesMarc = selected?.usesMarc ?? false;

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
        notify("❌ KOLIS-NET 검색에 실패했습니다.", "error");
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
      notify("✅ MARC를 가져왔습니다. 편집기에서 확인해 주세요.", "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || "MARC를 가져오지 못했습니다."), "error");
    }
  }

  // "<b>노랜드</b> : 천선란 소설집" → "노랜드"만 굵게 표시
  function renderTitle(title?: string) {
    if (!title) return null;
    const parts = title.split(/<b>(.*?)<\/b>/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
    );
  }

  // <b> 태그는 지우고, 15자 넘으면 잘라내고 "..." 붙이기
  function truncate(text?: string, max = 15) {
    if (!text) return "";
    const plain = text.replace(/<\/?b>/gi, "");
    return plain.length > max ? plain.slice(0, max) + "..." : plain;
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) {
      notify("❌ 로그인이 필요합니다.", "error");
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
      notify("✅ 등록되었습니다.", "success");
      setForm({});
      setMarc(DEFAULT_FIELDS);
      setMarcRaw(undefined);
      setKolisResults([]);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || "등록에 실패했습니다."), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-bold">자료 등록</h1>

      {/* 자료 종류 선택 */}
      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-neutral-500">자료 종류</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-48 cursor-pointer rounded-lg border px-3 py-2 text-sm"
        >
          {MATERIAL_TYPES.map((m) => (
            <option key={m.code} value={m.code}>
              {m.nameKo ?? m.code}
            </option>
          ))}
        </select>
      </label>

      {usesMarc ? (
        <div>
          <p className="mb-2 text-sm text-neutral-500">
            MARC 편집기 — ▼ 버튼으로 서브필드 구분자를 넣고, 그 뒤에 코드(a, b …)와 내용을 적어요.
          </p>

          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">KOLIS-NET에서 가져오기</p>
            <div className="flex gap-2">
              <input
                value={kolisKeyword}
                onChange={(e) => setKolisKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchKolis()}
                placeholder="제목 또는 저자로 검색"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => searchKolis()}
                className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
              >
                검색
              </button>
            </div>

            {kolisLoading && <p className="mt-2 text-sm text-neutral-400">검색 중...</p>}

            {kolisResults.length > 0 && (
              <ul className="mt-3 divide-y divide-neutral-200">
                {kolisResults.map((r) => (
                  <li key={r.recKey} className="flex items-center justify-between gap-2 py-2">
                    <div className="text-sm">
                      <p className="font-medium">{renderTitle(r.title)}</p>
                      <p className="text-neutral-400">
                        {truncate(r.author)} · {truncate(r.publisher)} · {truncate(r.pubYear)} · {truncate(r.libName)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => importKolis(r.recKey)}
                      className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                    >
                      이 자료 가져오기
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
                  이전
                </button>
                <span className="text-neutral-500">
                  {kolisPage} / {Math.ceil(kolisTotal / 10)} 페이지 (총 {kolisTotal}건)
                </span>
                <button
                  type="button"
                  disabled={kolisPage >= Math.ceil(kolisTotal / 10)}
                  onClick={() => searchKolis(kolisPage + 1)}
                  className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}

          </div>

          <MarcEditor fields={marc} onChange={setMarc} />
        </div>
      ) : (
        <div className="space-y-3">
          {SIMPLE_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-sm text-neutral-500">
                {f.label}
                {f.required && " *"}
              </span>
              <input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        className="mt-5 cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
      >
        저장
      </button>
    </div>
  );
}