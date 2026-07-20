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
  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState<Record<string, string>>({});

  const selected = MATERIAL_TYPES.find((m) => m.code === type);
  const usesMarc = selected?.usesMarc ?? false;

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) {
      notify("❌ 로그인이 필요합니다.", "error");
      return;
    }

    const body = usesMarc ? { type, marc } : { type, ...form };

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
                className="w-full rounded-lg border px-3 py-2 text-sm"
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