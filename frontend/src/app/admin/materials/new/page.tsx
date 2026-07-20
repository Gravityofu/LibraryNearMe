"use client";

import { useEffect, useState } from "react";
import { MATERIAL_TYPES } from "@/lib/material-types";
import { useI18n } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotify } from "@/components/notify-provider";

const API_URL = "http://localhost:3001";

const EMPTY = {
  title: "", creator: "", publisher: "", pubYear: "", isbn: "",
  classNumber: "", format: "", subject: "", language: "",
  summary: "", coverUrl: "", onlineUrl: "",
};

export default function NewMaterialPage() {
  const { lang } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [form, setForm] = useState(EMPTY);
  const { notify } = useNotify();

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const selected = MATERIAL_TYPES.find((t) => t.code === type);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const res = await fetch(`${API_URL}/materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, ...form }),
    });
    if (res.ok) {
      notify("✅ 등록되었습니다.", "success");
      setForm(EMPTY);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || "등록에 실패했습니다."), "error");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-bold">자료 등록</h1>

      {/* 1) 종류 선택 */}
      <div className="mb-6">
        <Label htmlFor="type">자료 종류</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full cursor-pointer rounded-md border border-neutral-300 bg-white p-2 text-sm"
        >
          <option value="">— 종류를 선택하세요 —</option>
          {MATERIAL_TYPES.map((t) => (
            <option key={t.code} value={t.code}>
              {lang === "ko" ? t.nameKo : t.nameEn}
            </option>
          ))}
        </select>
      </div>

      {/* 2-a) 책·DVD → 다음 단계 안내 */}
      {selected?.usesMarc && (
        <Card>
          <CardContent className="p-6 text-sm text-neutral-500">
            책·DVD는 MARC 편집기로 등록합니다. 그 화면은 다음 단계(12-3)에서
            만들어요. 지금은 다른 종류(비도서)로 등록을 시험해 보세요.
          </CardContent>
        </Card>
      )}

      {/* 2-b) 비도서 → 간단 폼 */}
      {selected && !selected.usesMarc && (
        <Card>
          <CardHeader>
            <CardTitle>서지 정보 입력</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="제목 *" value={form.title} onChange={(v) => set("title", v)} />
            <Field label="저자 / 제작자" value={form.creator} onChange={(v) => set("creator", v)} />
            <Field label="발행처" value={form.publisher} onChange={(v) => set("publisher", v)} />
            <Field label="발행년" value={form.pubYear} onChange={(v) => set("pubYear", v)} />
            <Field label="ISBN(또는 유사 번호)" value={form.isbn} onChange={(v) => set("isbn", v)} />
            <Field label="분류기호" value={form.classNumber} onChange={(v) => set("classNumber", v)} />
            <Field label="형태(크기·형식)" value={form.format} onChange={(v) => set("format", v)} />
            <Field label="주제어" value={form.subject} onChange={(v) => set("subject", v)} />
            <Field label="언어" value={form.language} onChange={(v) => set("language", v)} />
            <Field label="요약 / 설명" value={form.summary} onChange={(v) => set("summary", v)} />
            <Field label="표지 이미지 주소" value={form.coverUrl} onChange={(v) => set("coverUrl", v)} />
            <Field label="온라인 접근 주소" value={form.onlineUrl} onChange={(v) => set("onlineUrl", v)} />
            <Button className="cursor-pointer" onClick={handleSave}>등록하기</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

// 라벨 + 입력칸 한 줄을 만드는 작은 도우미
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}