"use client";

import { useState } from "react";

export type MarcField = { tag: string; ind1: string; ind2: string; value: string };

// 처음에 미리 깔아 둘 자주 쓰는 태그들
export const DEFAULT_FIELDS: MarcField[] = [
  { tag: "245", ind1: "0", ind2: "0", value: "▼a" },   // 서명·저자
  { tag: "100", ind1: "1", ind2: " ", value: "▼a" },   // 저자
  { tag: "260", ind1: " ", ind2: " ", value: "▼a ▼b ▼c" }, // 발행사항
  { tag: "020", ind1: " ", ind2: " ", value: "▼a" },   // ISBN
  { tag: "056", ind1: " ", ind2: " ", value: "▼a ▼2" }, // 분류기호(KDC)
  { tag: "090", ind1: " ", ind2: " ", value: "▼a ▼b" }, // 청구기호(a)·저자기호(b)
  { tag: "300", ind1: " ", ind2: " ", value: "▼a ▼c" }, // 형태사항
  { tag: "653", ind1: " ", ind2: " ", value: "▼a" },   // 주제어
  { tag: "041", ind1: " ", ind2: " ", value: "▼a" },   // 언어
  { tag: "500", ind1: " ", ind2: " ", value: "▼a" },   // 일반주기
  { tag: "700", ind1: "1", ind2: " ", value: "▼a" },   // 부저자
  { tag: "950", ind1: "0", ind2: " ", value: "▼a" },   // 로컬정보 - 가격
];

// 태그 옆에 보여줄 이름표
const TAG_NAMES: Record<string, string> = {
  "020": "ISBN", "041": "언어", "056": "분류기호",
  "090": "청구기호", "100": "저자", "245": "서명·저자",
  "250": "판사항", "260": "발행사항", "300": "형태사항",
  "490": "총서", "500": "일반주기", "653": "주제어", "700": "부저자",
  "950": "로컬정보(가격)", 
};

export default function MarcEditor({
  fields,
  onChange,
}: {
  fields: MarcField[];
  onChange: (f: MarcField[]) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const sorted = [...fields].sort((a, b) => a.tag.localeCompare(b.tag));

  function update(i: number, key: keyof MarcField, val: string) {
    onChange(sorted.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  }
  function addField() {
    const tag = newTag.trim();
    if (!/^\d{3}$/.test(tag)) return; // 세 자리 숫자만
    onChange([...sorted, { tag, ind1: " ", ind2: " ", value: "▼a" }]);
    setNewTag("");
  }
  function removeField(i: number) {
    onChange(sorted.filter((_, idx) => idx !== i));
  }
  function insertDelimiter(i: number) {
    update(i, "value", sorted[i].value + "▼");
  }

  return (
    <div className="space-y-2">
      {sorted.map((f, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-2"
        >
          {/* 태그 번호 + 이름표 */}
          <div className="w-14 shrink-0">
            <input
              value={f.tag}
              onChange={(e) => update(i, "tag", e.target.value)}
              className="w-full rounded border px-1 py-1 text-center text-sm font-semibold"
            />
            <p className="mt-0.5 text-center text-[10px] text-neutral-400">
              {TAG_NAMES[f.tag] ?? ""}
            </p>
          </div>

          {/* 지시기호 두 칸 */}
          <input
            value={f.ind1}
            onChange={(e) => update(i, "ind1", e.target.value)}
            maxLength={1}
            className="w-7 rounded border px-1 py-1 text-center text-sm"
          />
          <input
            value={f.ind2}
            onChange={(e) => update(i, "ind2", e.target.value)}
            maxLength={1}
            className="w-7 rounded border px-1 py-1 text-center text-sm"
          />

          {/* 값 */}
          <textarea
            value={f.value}
            onChange={(e) => update(i, "value", e.target.value)}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            rows={1}
            className="min-h-[38px] flex-1 resize-none overflow-hidden rounded border px-2 py-1 text-sm"
          />

          {/* ▼ 넣기 / 삭제 */}
          <button
            type="button"
            onClick={() => insertDelimiter(i)}
            title="서브필드 구분자 넣기"
            className="shrink-0 cursor-pointer rounded border px-2 py-1 text-sm"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => removeField(i)}
            title="이 줄 삭제"
            className="shrink-0 cursor-pointer rounded border px-2 py-1 text-sm text-red-500"
          >
            ✕
          </button>
        </div>
      ))}

      {/* 새 태그 추가 */}
      <div className="flex items-center gap-2 pt-1">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="예: 700"
          className="w-24 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={addField}
          className="cursor-pointer rounded-lg bg-[#383838] px-3 py-1.5 text-sm text-[#F9F6F0]"
        >
          + 태그 추가
        </button>
      </div>
    </div>
  );
}