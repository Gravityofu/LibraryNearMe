# 개선28. 자료 등록 화면 - 표지 URL · 자료 위치 URL · 주제어 여러 개 입력

## 🎯 목표

자료 등록 화면에 요청하신 대로 이런 것들을 추가·수정할게요.

1. **표지 이미지(썸네일) URL 입력칸**을 모든 자료 종류에 공통으로 추가합니다. 도서·DVD는 나중에 KOLIS-NET 등에서 자동으로 불러올 수도 있지만, 못 가져오는 경우나 다른 자료 종류를 위해 항상 직접 입력할 수 있게 해요.
2. **디지털 자료**를 등록할 때만, 그 자료가 있는 곳의 주소를 적는 **'자료 위치 URL'** 입력칸을 추가로 보여줘요.
3. 간단 입력폼의 '언어' 라벨을 **'사용 언어'**로 바꿔요.
4. '주제어'를 한 칸짜리 텍스트 입력이 아니라, **단어 하나 입력 → 스페이스바 → 옆에 새 입력칸 생성**하는 방식으로 바꿔요. 그리고 무한정 늘어나지 않도록, '설정 → 자료 종류' 화면에 도서관 전체에 공통으로 적용되는 **'최대 주제어 입력 개수'**를 만들어요. (말씀하신 대로 종류별이 아니라 도서관 전체 공통 값 하나로 만들었어요.)

> 💡 이번에도 실제 파일(`schema.prisma`, `library.service.ts`, `materials.service.ts`, `dictionary.ts`, `material-types-settings-form.tsx`, `materials/new/page.tsx`)을 직접 확인하고 작성했어요.

---

## 1단계. 데이터베이스에 '최대 주제어 입력 개수' 항목 추가하기

**파일**: `backend/prisma/schema.prisma`

**찾기:**

```prisma
  footerVersion   String   @default("1.0.0")                // 오늘 추가: Footer에 보일 버전
  footerCopyright String   @default("ⓒ 2026 Gravityofu")    // 오늘 추가: Footer에 보일 저작권 문구
  createdAt    DateTime @default(now())
```

**이렇게 바꿔주세요:**

```prisma
  footerVersion   String   @default("1.0.0")                // 오늘 추가: Footer에 보일 버전
  footerCopyright String   @default("ⓒ 2026 Gravityofu")    // 오늘 추가: Footer에 보일 저작권 문구
  maxSubjectKeywords Int   @default(10)                      // ← 추가: 자료 등록 시 주제어 최대 입력 개수
  createdAt    DateTime @default(now())
```

**마이그레이션 실행:**

```
cd C:\projects\LibraryNearMe\backend
npx prisma migrate dev --name add_max_subject_keywords
```

---

## 2단계. 백엔드 - 도서관 설정 저장 기능에 새 항목 반영하기

**파일**: `backend/src/library/library.service.ts`

**찾기:**

```typescript
  async updateLibrary(data: {
    name: string; primaryColor: string; logoUrl?: string;
    footerVersion?: string; footerCopyright?: string;
    footerBgColor?: string; footerTextColor?: string;
    sidebarBgColor?: string; sidebarTextColor?: string;
    buttonStyles?: any;
    fontFamily?: string;
    fontWeight?: string;
  }) {
    const library = await this.prisma.library.findFirst();
    if (!library) return null;
    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name, primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || undefined,
        footerVersion: data.footerVersion || undefined,
        footerCopyright: data.footerCopyright || undefined,
        footerBgColor: data.footerBgColor || undefined,
        footerTextColor: data.footerTextColor || undefined,
        sidebarBgColor: data.sidebarBgColor || undefined,
        sidebarTextColor: data.sidebarTextColor || undefined,
        buttonStyles: data.buttonStyles ?? undefined,
        fontFamily: data.fontFamily || undefined,
        fontWeight: data.fontWeight || undefined,
      },
    });
  }
```

**이렇게 바꿔주세요:**

```typescript
  async updateLibrary(data: {
    name: string; primaryColor: string; logoUrl?: string;
    footerVersion?: string; footerCopyright?: string;
    footerBgColor?: string; footerTextColor?: string;
    sidebarBgColor?: string; sidebarTextColor?: string;
    buttonStyles?: any;
    fontFamily?: string;
    fontWeight?: string;
    maxSubjectKeywords?: number;
  }) {
    const library = await this.prisma.library.findFirst();
    if (!library) return null;
    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name, primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || undefined,
        footerVersion: data.footerVersion || undefined,
        footerCopyright: data.footerCopyright || undefined,
        footerBgColor: data.footerBgColor || undefined,
        footerTextColor: data.footerTextColor || undefined,
        sidebarBgColor: data.sidebarBgColor || undefined,
        sidebarTextColor: data.sidebarTextColor || undefined,
        buttonStyles: data.buttonStyles ?? undefined,
        fontFamily: data.fontFamily || undefined,
        fontWeight: data.fontWeight || undefined,
        maxSubjectKeywords: data.maxSubjectKeywords ?? undefined,
      },
    });
  }
```

### 무슨 코드인가요?

`updateLibrary`는 '설정 → 도서관' 탭뿐 아니라, 이번에 '설정 → 자료 종류' 탭에 새로 만들 '최대 주제어 입력 개수' 저장 기능도 함께 쓰는 함수예요. `maxSubjectKeywords`만 보내도, 나머지 값들은 `undefined`로 처리되어 기존 값이 그대로 유지돼요. (Prisma는 `undefined`인 항목은 그냥 건드리지 않아요.)

---

## 3단계. 백엔드 - MARC로 등록할 때도 표지 URL을 직접 입력받도록 하기

**파일**: `backend/src/materials/materials.service.ts`

**찾기:**

```typescript
    let fields: any;
    if (Array.isArray(marc) && marc.length > 0) {
      // 책·DVD: MARC에서 각 칸을 자동으로 뽑고, 원본도 함께 저장
      fields = extractColumns(marc);
      fields.marc = marc;
      if (data.marcRaw) fields.marcRaw = data.marcRaw; // KOLIS-NET에서 받은 원본 텍스트(있으면)
    } else {
```

**이렇게 바꿔주세요:**

```typescript
    let fields: any;
    if (Array.isArray(marc) && marc.length > 0) {
      // 책·DVD: MARC에서 각 칸을 자동으로 뽑고, 원본도 함께 저장
      fields = extractColumns(marc);
      fields.marc = marc;
      if (data.marcRaw) fields.marcRaw = data.marcRaw; // KOLIS-NET에서 받은 원본 텍스트(있으면)
      if (data.coverUrl) fields.coverUrl = data.coverUrl; // 표지 URL은 MARC에서 자동으로 뽑히지 않아서, 직접 입력받은 값을 그대로 저장
    } else {
```

### 무슨 코드인가요?

`Material` 모델에는 원래부터 `coverUrl`(표지 이미지 주소)과 `onlineUrl`(온라인 접근 주소) 칸이 이미 있었지만, 지금까지는 화면에 입력칸이 없어서 쓰인 적이 없었어요. 비도서(간단 입력폼)는 입력한 값이 그대로 저장되니 괜찮은데, 도서·DVD처럼 MARC로 등록하는 경우엔 `extractColumns()`가 MARC 태그에서 뽑아낸 값만 저장하다 보니 표지 URL이 빠질 뻔했어요. 그래서 이 한 줄을 추가해서, MARC로 등록할 때도 직접 입력한 표지 URL이 함께 저장되게 했어요.

---

## 4단계. 다국어 사전에 문구 추가·수정하기

**파일**: `frontend/src/lib/dictionary.ts`

### 1) 한국어(ko) 블록 - '언어' → '사용 언어'로 수정

**찾기:**

```typescript
    "materials.new.field.language": "언어",
```

**이렇게 바꿔주세요:**

```typescript
    "materials.new.field.language": "사용 언어",
```

### 2) 한국어(ko) 블록 - 새 문구 추가

**찾기:**

```typescript
    "materials.new.field.summary": "설명",

    "materials.new.tagHelpBtn": "태그 설명",
```

**이렇게 바꿔주세요:**

```typescript
    "materials.new.field.summary": "설명",
    "materials.new.field.coverUrl": "표지 이미지 URL",
    "materials.new.field.onlineUrl": "자료 위치 URL",
    "materials.new.subjectHint": "단어를 입력하고 스페이스바를 누르면 다음 칸이 생겨요.",

    "materials.new.tagHelpBtn": "태그 설명",
```

### 3) 한국어(ko) 블록 - '최대 주제어 입력 개수' 설정 문구 추가

**찾기:**

```typescript
    "settings.materialTypes.kdc.empty": "아직 등록된 KDC 하위 규칙이 없습니다.",
    "settings.materialTypes.kdc.close": "닫기",
```

**이렇게 바꿔주세요:**

```typescript
    "settings.materialTypes.kdc.empty": "아직 등록된 KDC 하위 규칙이 없습니다.",
    "settings.materialTypes.kdc.close": "닫기",
    "settings.materialTypes.maxSubjectKeywords.label": "최대 주제어 입력 개수",
    "settings.materialTypes.maxSubjectKeywords.save": "저장",
    "settings.materialTypes.maxSubjectKeywords.saveSuccess": "저장되었습니다.",
    "settings.materialTypes.maxSubjectKeywords.saveFail": "저장에 실패했습니다.",
    "settings.materialTypes.maxSubjectKeywords.invalid": "1 이상의 숫자를 입력하세요.",
```

### 4) 영어(en) 블록 - 'Language' 문구는 그대로 두기

영어는 원래도 'Language'로 자연스러워서 바꾸지 않아도 괜찮아요. (원하시면 나중에 'Language Used' 등으로 따로 바꿔드릴게요.)

### 5) 영어(en) 블록 - 새 문구 추가

**찾기:**

```typescript
    "materials.new.field.summary": "Description",

    "materials.new.tagHelpBtn": "Tag Guide",
```

**이렇게 바꿔주세요:**

```typescript
    "materials.new.field.summary": "Description",
    "materials.new.field.coverUrl": "Cover Image URL",
    "materials.new.field.onlineUrl": "Resource Location URL",
    "materials.new.subjectHint": "Type a word and press space to add another box.",

    "materials.new.tagHelpBtn": "Tag Guide",
```

### 6) 영어(en) 블록 - '최대 주제어 입력 개수' 설정 문구 추가

**찾기:**

```typescript
    "settings.materialTypes.kdc.empty": "No KDC sub-rules yet.",
    "settings.materialTypes.kdc.close": "Close",
```

**이렇게 바꿔주세요:**

```typescript
    "settings.materialTypes.kdc.empty": "No KDC sub-rules yet.",
    "settings.materialTypes.kdc.close": "Close",
    "settings.materialTypes.maxSubjectKeywords.label": "Max Subject Keywords",
    "settings.materialTypes.maxSubjectKeywords.save": "Save",
    "settings.materialTypes.maxSubjectKeywords.saveSuccess": "Saved.",
    "settings.materialTypes.maxSubjectKeywords.saveFail": "Save failed.",
    "settings.materialTypes.maxSubjectKeywords.invalid": "Please enter a number of 1 or more.",
```

---

## 5단계. 설정 화면 - '최대 주제어 입력 개수' 입력란 추가하기

**파일**: `frontend/src/components/material-types-settings-form.tsx`

### 1) 새 상태(state) 추가하기

**찾기:**

```tsx
  const [showKdcModal, setShowKdcModal] = useState(false);
  const [showKdcForm, setShowKdcForm] = useState(false);
  const [kdcEditingId, setKdcEditingId] = useState<number | null>(null);
  const [kdcForm, setKdcForm] = useState(EMPTY_KDC_FORM);

  async function loadTypes() {
```

**이렇게 바꿔주세요:**

```tsx
  const [showKdcModal, setShowKdcModal] = useState(false);
  const [showKdcForm, setShowKdcForm] = useState(false);
  const [kdcEditingId, setKdcEditingId] = useState<number | null>(null);
  const [kdcForm, setKdcForm] = useState(EMPTY_KDC_FORM);

  // 자료 등록 화면에서 주제어를 몇 개까지 입력할 수 있는지 정하는, 도서관 전체 공통 값이에요.
  const [maxSubjectKeywords, setMaxSubjectKeywords] = useState("10");

  async function loadTypes() {
```

### 2) 값을 불러오고 저장하는 함수 추가하기

**찾기:**

```tsx
  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookType = types.find((mt) => mt.code === "book");
```

**이렇게 바꿔주세요:**

```tsx
  async function loadMaxSubjectKeywords() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      if (data?.maxSubjectKeywords) {
        setMaxSubjectKeywords(String(data.maxSubjectKeywords));
      }
    }
  }

  async function handleSaveMaxSubjectKeywords() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const value = Number(maxSubjectKeywords);
    if (!Number.isFinite(value) || value < 1) {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.invalid"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxSubjectKeywords: value }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.maxSubjectKeywords.saveSuccess"), "success");
    } else {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.saveFail"), "error");
    }
  }

  useEffect(() => {
    loadTypes();
    loadMaxSubjectKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookType = types.find((mt) => mt.code === "book");
```

### 3) 화면에 입력란 보여주기

**찾기:**

```tsx
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionPhysical")}</p>
```

**이렇게 바꿔주세요:**

```tsx
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.maxSubjectKeywords.label")}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={maxSubjectKeywords}
            onChange={(e) => setMaxSubjectKeywords(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <ThemedButton preset="버튼1" onClick={handleSaveMaxSubjectKeywords}>
            {t("settings.materialTypes.maxSubjectKeywords.save")}
          </ThemedButton>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionPhysical")}</p>
```

---

## 6단계. 자료 등록 화면 파일 통째로 교체하기

**파일**: `frontend/src/app/admin/materials/new/page.tsx`

이번에도 화면 여러 곳이 함께 바뀌기 때문에, 파일 전체를 아래 내용으로 통째로 바꿔주세요.

```tsx
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
          <AdminBackButton href="/admin/materials/list" />
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
          <button
            type="button"
            onClick={backToCategory}
            className="mb-3 cursor-pointer text-sm text-neutral-500 hover:underline"
          >
            ← {t("materials.new.step.backToCategory")}
          </button>
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
          <button
            type="button"
            onClick={backToSubtype}
            className="mb-3 cursor-pointer text-sm text-neutral-500 hover:underline"
          >
            ← {t("materials.new.step.backToSubtype")}
          </button>
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
```

### 무슨 코드인가요?

- `coverUrl`(표지 URL) 입력칸은 종류에 상관없이 항상 보여요. MARC 방식이든 간단 입력폼이든 상관없이 `form.coverUrl`에 저장돼요.
- `onlineUrl`(자료 위치 URL) 입력칸은 `selected.category === "DIGITAL"`일 때만 보여요. 지금은 디지털 자료가 모두 MARC를 쓰지 않는 종류라서 간단 입력폼과 함께 보이지만, 혹시 나중에 MARC를 쓰는 디지털 종류가 추가되더라도 이 조건은 그대로 잘 작동해요.
- 주제어는 `subjectWords`라는 문자열 배열로 관리해요. 처음엔 빈 칸 1개(`[""]`)로 시작하고, 마지막 칸에 글자를 쓰고 스페이스바를 누르면 `maxSubjectKeywords`(설정에서 정한 값)를 넘지 않는 선에서 옆에 빈 칸이 하나 더 생겨요. 빈 칸에서 백스페이스를 누르면 그 칸이 사라지고 바로 앞 칸으로 포커스가 돌아가요.
- 저장할 때는 `subjectWords`에서 빈 칸을 빼고 쉼표로 이어붙인 문자열을 서버로 보내요. (기존 `subject` 칸이 글자 하나짜리 문자열이었던 것과 형태를 맞췄어요.)
- '언어' 항목은 라벨만 '사용 언어'로 바뀌었을 뿐, 저장되는 값의 형태(`language` 칸)는 그대로예요.

---

## ✅ 확인하기

1. 백엔드에서 `npx prisma migrate dev --name add_max_subject_keywords`를 실행했는지 확인해주세요.
2. 백엔드와 프론트엔드를 모두 재시작해주세요.
3. 관리자 페이지 → 설정 → '자료 종류' 탭 맨 위에 '최대 주제어 입력 개수' 입력란이 보이는지 확인해주세요. 값을 바꿔서 저장해보세요.
4. 자료 등록 화면 → '도서'를 선택해서 표지 이미지 URL 입력칸이 보이는지 확인해주세요. (자료 위치 URL은 안 보여야 정상이에요.)
5. '웹페이지'(디지털 자료)를 선택해서 표지 이미지 URL과 자료 위치 URL 두 칸이 모두 보이는지 확인해주세요.
6. '보드게임'처럼 간단 입력폼을 쓰는 종류를 선택해서, '사용 언어' 라벨로 잘 바뀌었는지 확인해주세요.
7. 주제어 칸에 단어를 입력하고 스페이스바를 눌러보세요. 옆에 새 칸이 생기고 포커스가 그 칸으로 이동하는지 확인해주세요.
8. 방금 설정한 '최대 주제어 입력 개수'만큼 칸을 채운 뒤, 스페이스바를 더 눌러도 칸이 더 생기지 않는지 확인해주세요.
9. 빈 칸에서 백스페이스를 눌러 칸이 지워지는지 확인해주세요.
10. 자료 하나를 실제로 등록해보고, 정상적으로 저장되는지 확인해주세요.

---

## 📌 GitHub에 저장하기

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선28: 자료 등록 화면에 표지 URL, 자료 위치 URL, 주제어 다중입력 추가"
git push
```

---

## 📋 최종 점검표

- [ ] `schema.prisma`에 `maxSubjectKeywords`를 추가하고 마이그레이션을 실행했다
- [ ] `library.service.ts`에서 새 항목을 저장할 수 있게 했다
- [ ] `materials.service.ts`에서 MARC 등록 시에도 표지 URL이 저장되게 했다
- [ ] `dictionary.ts`에 한국어/영어 문구를 추가·수정했다
- [ ] '설정 → 자료 종류'에 '최대 주제어 입력 개수' 입력란을 추가했다
- [ ] 자료 등록 화면에 표지 URL 입력칸이 항상 보인다
- [ ] 디지털 자료를 고르면 자료 위치 URL 입력칸이 추가로 보인다
- [ ] '언어' 라벨이 '사용 언어'로 바뀌었다
- [ ] 주제어를 스페이스바로 여러 칸에 나눠 입력할 수 있다
- [ ] 설정한 최대 개수를 넘으면 더 이상 칸이 생기지 않는다
- [ ] GitHub에 커밋 & 푸시를 완료했다

수고하셨습니다! 이제 자료 등록 화면이 표지 이미지, 디지털 자료 위치, 검색에 쓰일 주제어까지 더 꼼꼼하게 챙길 수 있게 됐어요.
