# 12단계 (3) — 책·DVD MARC 편집기

> 목표: 책·DVD 같은 자료를 **MARC 태그**로 입력하는 편집기를 만듭니다.
> 자주 쓰는 태그(245·260·056 …)를 미리 깔아 두고, 저장하면 제목·저자·분류기호를
> **표의 각 칸으로 자동으로 뽑아** 넣습니다.
> 소요 시간: 약 40분

---

## 오늘 만드는 것 (그림으로)

```
자료 종류 = 책/DVD  →  [ MARC 편집기 ]  →  저장
                          245 ▼a 홍길동전
                          100 ▼a 허균          ─┐
                          260 ▼b 민음사 ▼c2020   │  저장할 때
                          056 ▼a 813.5          ─┘  자동으로 칸에 뽑아 담김
                                                     (제목·저자·발행처·분류기호…)

자료 종류 = 비도서   →  [ 간단 폼 ]  →  저장   (지난번 그대로)
```

- **MARC란?** 도서관이 책 정보를 적는 표준 양식이에요. `245`(서명), `100`(저자)처럼 **세 자리 태그**마다 정해진 뜻이 있고, 그 안에서 `▼a`, `▼b` 같은 **서브필드 구분자**로 잘게 나눠 적습니다.
- 오늘은 **직접 태그를 입력**하는 편집기까지만 만듭니다. 다음 12-4에서 KOLIS-NET에서 검색해 이 편집기를 **자동으로 채우는** 기능을 붙일 거예요.

준비: backend·frontend 두 서버를 모두 켜 두세요.

---

## 1. 백엔드 — MARC에서 칸 뽑아내는 도구 만들기 (약 10분)

`backend` → `src` → `materials` 폴더에 **`marc.util.ts`** 파일을 새로 만들어 붙여넣습니다.

```ts
// MARC 한 줄의 구조: { tag: "245", ind1: "0", ind2: "0", value: "▼a홍길동전▼d허균" }
export type MarcField = {
  tag: string;
  ind1: string;
  ind2: string;
  value: string;
};

// value("▼a홍길동전▼d허균")에서 원하는 서브필드(예: "a") 하나를 뽑습니다.
export function sub(value: string, code: string): string | undefined {
  if (!value) return undefined;
  for (const part of value.split("▼")) {
    if (part.startsWith(code)) return part.slice(code.length).trim();
  }
  return undefined;
}

// value에서 ▼표시를 걷어내고 사람이 읽기 좋은 한 줄로 만듭니다. (형태사항 300 등에 사용)
export function clean(value: string): string {
  if (!value) return "";
  return value
    .split("▼")
    .map((p) => p.slice(1).trim()) // 맨 앞 글자(서브필드 코드) 제거
    .filter(Boolean)
    .join(" ")
    .trim();
}

// MARC 태그 목록에서 표의 각 칸 값을 뽑아냅니다.
export function extractColumns(marc: MarcField[]) {
  const one = (tag: string, code: string) => {
    const f = marc.find((x) => x.tag === tag);
    return f ? sub(f.value, code) : undefined;
  };
  const cleanTag = (tag: string) => {
    const f = marc.find((x) => x.tag === tag);
    return f ? clean(f.value) : undefined;
  };
  // 주제어(653)는 여러 줄일 수 있어 모두 모아 "; "로 잇습니다.
  const subjects = marc
    .filter((x) => x.tag === "653")
    .map((x) => sub(x.value, "a"))
    .filter(Boolean)
    .join("; ");

  return {
    title: one("245", "a"),                    // 서명
    creator: one("100", "a") || one("245", "d"), // 저자(100 없으면 245 ▼d)
    publisher: one("260", "b"),                // 발행처
    pubYear: one("260", "c"),                  // 발행년
    isbn: one("020", "a"),                     // ISBN
    classNumber: one("056", "a"),              // 분류기호
    format: cleanTag("300") || undefined,      // 형태사항
    subject: subjects || undefined,            // 주제어
    language: one("041", "a"),                 // 언어
    summary: one("500", "a"),                  // 요약/주기
  };
}
```

> 규칙 요약: 제목←245▼a, 저자←100▼a(없으면 245▼d), 발행처←260▼b, 발행년←260▼c, ISBN←020▼a, 분류기호←056▼a, 형태←300 전체, 주제어←653▼a들, 언어←041▼a, 요약←500▼a.
> `090`(청구기호) 등 나머지 태그는 칸으로 뽑지 않고 **MARC 원본에만** 남습니다.

---

## 2. 백엔드 — 저장 함수가 MARC를 처리하게 고치기 (약 8분)

`backend` → `src` → `materials` → **`materials.service.ts`** 를 엽니다.

**① 맨 위 import 줄 근처에 추가:**

```ts
import { extractColumns } from "./marc.util";
```

**② `createBibliographic` 함수를 아래로 교체:**

```ts
  async createBibliographic(userId: number, libraryId: number, data: any) {
    const { type, marc } = data;
    if (!type) {
      throw new BadRequestException("자료 종류를 선택하세요.");
    }

    let fields: any;
    if (Array.isArray(marc) && marc.length > 0) {
      // 책·DVD: MARC에서 각 칸을 자동으로 뽑고, 원본도 함께 저장
      fields = extractColumns(marc);
      fields.marc = marc;
    } else {
      // 비도서: 폼에서 받은 값 그대로
      const { type: _t, marc: _m, ...rest } = data;
      fields = rest;
    }

    if (!fields.title || !String(fields.title).trim()) {
      throw new BadRequestException(
        "제목(서명)은 필수입니다. MARC라면 245 ▼a를 확인하세요.",
      );
    }

    return this.prisma.material.create({
      data: {
        libraryId,
        type,
        createdById: userId,
        ...fields,
      },
    });
  }
```

> `BadRequestException`이 파일 맨 위 import에 이미 있는지 확인하세요. 없다면
> `import { Injectable, BadRequestException } from "@nestjs/common";` 처럼 추가합니다.

**③ 컨트롤러가 `marc`까지 함께 넘기는지 확인:** `materials.controller.ts`의 저장 부분이 아래처럼 **body 전체**를 넘기고 있으면 그대로 두면 됩니다(고칠 것 없음).

```ts
  @Post()
  @UseGuards(AdminGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.materials.createBibliographic(
      req.user.sub,
      req.user.libraryId,
      body,           // ← body 전체(여기에 marc 포함)를 넘기면 OK
    );
  }
```

✅ **확인하기**: backend 터미널에 빨간 오류 없이 서버가 그대로 켜져 있으면 됩니다.

---

## 3. 프론트 — MARC 편집기 컴포넌트 만들기 (약 10분)

`frontend` → `src` → `components` 에 **`marc-editor.tsx`** 파일을 만들어 붙여넣습니다.

```tsx
"use client";

import { useState } from "react";

export type MarcField = { tag: string; ind1: string; ind2: string; value: string };

// 처음에 미리 깔아 둘 자주 쓰는 태그들
export const DEFAULT_FIELDS: MarcField[] = [
  { tag: "245", ind1: "0", ind2: "0", value: "▼a" },   // 서명·저자
  { tag: "100", ind1: "1", ind2: " ", value: "▼a" },   // 저자
  { tag: "260", ind1: " ", ind2: " ", value: "▼a▼b▼c" }, // 발행사항
  { tag: "020", ind1: " ", ind2: " ", value: "▼a" },   // ISBN
  { tag: "056", ind1: " ", ind2: " ", value: "▼a▼2" }, // 분류기호(KDC)
  { tag: "090", ind1: " ", ind2: " ", value: "▼a" },   // 청구기호
  { tag: "300", ind1: " ", ind2: " ", value: "▼a▼c" }, // 형태사항
  { tag: "653", ind1: " ", ind2: " ", value: "▼a" },   // 주제어
  { tag: "041", ind1: " ", ind2: " ", value: "▼a" },   // 언어
  { tag: "500", ind1: " ", ind2: " ", value: "▼a" },   // 일반주기
];

// 태그 옆에 보여줄 이름표
const TAG_NAMES: Record<string, string> = {
  "020": "ISBN", "041": "언어", "056": "분류기호",
  "090": "청구기호", "100": "저자", "245": "서명·저자",
  "250": "판사항", "260": "발행사항", "300": "형태사항",
  "490": "총서", "500": "일반주기", "653": "주제어", "700": "부저자",
};

export default function MarcEditor({
  fields,
  onChange,
}: {
  fields: MarcField[];
  onChange: (f: MarcField[]) => void;
}) {
  const [newTag, setNewTag] = useState("");

  function update(i: number, key: keyof MarcField, val: string) {
    onChange(fields.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  }
  function addField() {
    const tag = newTag.trim();
    if (!/^\d{3}$/.test(tag)) return; // 세 자리 숫자만
    onChange([...fields, { tag, ind1: " ", ind2: " ", value: "▼a" }]);
    setNewTag("");
  }
  function removeField(i: number) {
    onChange(fields.filter((_, idx) => idx !== i));
  }
  function insertDelimiter(i: number) {
    update(i, "value", fields[i].value + "▼");
  }

  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
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
            rows={1}
            className="min-h-[38px] flex-1 rounded border px-2 py-1 text-sm"
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
```

- 각 줄: **태그 번호 / 지시기호 2칸 / 값** 순서예요.
- 값 칸 오른쪽 **▼ 버튼**을 누르면 그 줄 끝에 `▼`가 붙어요. 그 뒤에 `a` 같은 코드와 내용을 이어 적으면 `▼a홍길동전`이 됩니다.
- **✕**는 그 줄 삭제, 아래 **+ 태그 추가**로 새 태그(세 자리 숫자)를 넣을 수 있어요.

---

## 4. 프론트 — 자료 등록 화면에 편집기 붙이기 (약 8분)

`frontend` → `src` → `app` → `admin` → `materials` → `new` → **`page.tsx`** 를 열어 **파일 전체를 아래로 교체**합니다.

```tsx
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
```

- 자료 종류에서 **책/DVD**를 고르면 MARC 편집기가, **그 외**를 고르면 지난번 간단 폼이 나옵니다.
- 저장 버튼은 하나로, 종류에 맞는 형식으로 알아서 보냅니다.

---

## 5. 확인하기 (약 4분)

관리자 → 자료 등록 화면에서:

1. 종류를 **도서(book)** 로 두고, `245` 줄 값을 `▼a홍길동전▼d허균` 으로, `100` 줄을 `▼a허균` 으로, `056` 줄을 `▼a813.5` 로 적어 보세요.
2. **저장** → "✅ 등록되었습니다." 팝업.
3. 종류를 **기타 등** 비도서로 바꾸면 간단 폼으로 바뀌나요?
4. 제목(245 ▼a)을 비운 채 저장하면 "제목은 필수입니다" 팝업이 뜨나요?

**표에 잘 뽑혔는지 확인** — backend 폴더에서:

```
cd C:\projects\LibraryNearMe\backend
npx prisma studio
```

`Material` 표에서 방금 등록한 줄의 `title`=홍길동전, `creator`=허균, `classNumber`=813.5 로 채워지고, `marc` 칸에 원본이 통째로 들어 있으면 성공! 확인 후 `Ctrl+C`.

✅ MARC로 넣은 값이 각 칸으로 자동으로 나뉘어 들어갔다면 완성입니다. 🎉

---

## 6. GitHub에 저장 (약 2분)

```
cd C:\projects\LibraryNearMe
git status
```

🔒 `.env` 가 목록에 없는지 확인한 뒤:

```
git add .
git commit -m "12단계(3): 책·DVD MARC 편집기 + 저장 시 칸 자동 추출"
git push
```

---

## 최종 점검표

- [ ] `backend/src/materials/marc.util.ts` 생성 (sub·clean·extractColumns)
- [ ] `materials.service.ts` — extractColumns import + createBibliographic 교체
- [ ] 컨트롤러가 body 전체(marc 포함)를 넘기는지 확인
- [ ] `frontend/src/components/marc-editor.tsx` 생성
- [ ] `admin/materials/new/page.tsx` 전체 교체 (책/DVD → 편집기, 그 외 → 폼)
- [ ] 편집기로 등록 → Prisma Studio에서 칸 자동 추출 확인
- [ ] GitHub에 올림

---

## 다음 단계 예고 — 12단계 (4): KOLIS-NET 검색으로 자동 채우기

ISBN이나 서명으로 **KOLIS-NET에서 검색** → 받아온 MARC(ISO 2709)를 해석해서 오늘 만든 편집기를 **자동으로 채웁니다**. 사서는 확인·수정만 하고 저장하면 돼요. 이때 실제 인증키로 시험합니다(인증키는 backend에만 보관). 완료되면 알려주세요!
