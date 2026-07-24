# 개선 (4) — "새로 등록" 이름 변경 + 최근 등록번호 표시 + 뒤로 가기 버튼

> 목표: 실물 등록 화면의 "새로 등록" 링크 이름을 명확하게 바꾸고, 등록번호 칸 옆에
> 가장 최근 등록번호를 보여주고, 관리자 페이지 오른쪽 위에 공통 "뒤로 가기" 버튼을 만듭니다.
> 소요 시간: 약 20분

---

## 1. "새로 등록" → "입력 데이터 비우기" — 약 3분

맞아요, 그 링크는 오른쪽 폼에 입력된 값을 전부 지우고 새 실물을 등록할 수 있게 비워주는 기능이에요(코드에서는 `resetForm()`이라는 함수를 부릅니다). 화면 글자만 바꾸면 되니, 코드는 안 건드리고 번역 사전만 고치면 됩니다.

`frontend` → `src` → `lib` → **`dictionary.ts`** 를 엽니다.

**① `ko:` 블록**에서 아래 줄을 찾아서

```ts
    "materials.copies.newEntry": "새로 등록",
```

이렇게 바꿔주세요.

```ts
    "materials.copies.newEntry": "입력 데이터 비우기",
```

**② `en:` 블록**에서도 같은 이름표를 찾아서 (선택사항이지만, 뜻을 맞춰두는 게 좋아요)

```ts
    "materials.copies.newEntry": "New Entry",
```

이렇게 바꿔주세요.

```ts
    "materials.copies.newEntry": "Clear Form",
```

---

## 2. 등록번호 칸 옆에 최근 등록번호 표시 — 약 10분

실물 목록은 최근 등록한 순서대로 위에서부터 나오고 있어요(`material.copies` 배열의 맨 앞이 가장 최근 등록된 실물입니다). 그래서 배열의 첫 번째 항목의 등록번호를 옆에 보여주면 됩니다.

> ⚠️ **확인해 주세요**: 왼쪽 아래 "실물 목록" 상자에서, 방금 등록한 실물이 맨 위에 보이나요? 만약 맨 위가 아니라 **맨 아래**에 보인다면, 아래 코드에서 `material.copies[0]` 부분을 `material.copies[material.copies.length - 1]`로 바꿔야 해요. 일단 아래대로 넣어보고, 확인 단계에서 순서가 반대면 알려주세요.

### 2-1. 번역 이름표 추가

같은 `dictionary.ts` 파일에서, 방금 수정한 `"materials.copies.newEntry"` 줄 **바로 아래**에 추가하세요.

**한글 쪽:**

```ts
    "materials.copies.latestRegNo": "최근 등록",
```

**영어 쪽:**

```ts
    "materials.copies.latestRegNo": "Latest",
```

### 2-2. 화면 코드 수정

`frontend` → `src` → `app` → `admin` → `materials` → `copies` → **`page.tsx`** 를 엽니다.

아래 부분을 찾으세요. (등록번호 입력 칸의 라벨 부분이에요.)

```tsx
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.regNo")} *</span>
              <input
                value={form.registrationNo}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
```

이렇게 바꿔주세요. (라벨 부분만 바뀌었어요.)

```tsx
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">
                {t("materials.copies.regNo")} *
                {material.copies.length > 0 && (
                  <span className="ml-2 text-xs text-neutral-400">
                    ({t("materials.copies.latestRegNo")}: {material.copies[0].registrationNo})
                  </span>
                )}
              </span>
              <input
                value={form.registrationNo}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
```

`material.copies.length > 0 && (...)` 는 "실물이 하나라도 있을 때만 이 부분을 보여줘"라는 뜻이에요. 실물이 아예 없는 새 자료라면 최근 등록번호도 없으니 안 보이는 게 맞습니다.

---

## 3. 관리자 페이지 공통 "뒤로 가기" 버튼 — 약 7분

말씀하신 규칙대로 만들게요 — **왼쪽 메뉴를 눌러서 바로 들어가는 첫 화면**(예: "목록" 메뉴 → 목록 화면, "도서관 설정" 메뉴 → 설정 화면)에는 뒤로 가기 버튼이 없고, **그 화면에서 한 번 더 들어간 화면**(예: 목록 → 실물 등록, 목록 → 자료 신규 등록)에는 오른쪽 위에 뒤로 가기 버튼이 생깁니다.

버튼을 여기저기 복사-붙여넣기 하지 않도록, **재사용 가능한 부품 하나**로 만들어서 앞으로 새 화면을 만들 때마다 이 부품만 갖다 쓸 거예요.

### 3-1. 뒤로 가기 부품 새로 만들기

`frontend` → `src` → `components` 안에 **`admin-back-button.tsx`** 파일을 새로 만들어 아래를 붙여넣습니다.

```tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/components/language-provider";

export default function AdminBackButton({ href }: { href: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
    >
      ← {t("admin.backButton")}
    </Link>
  );
}
```

`href`라는 값 하나만 넣어주면 되는 버튼이에요. 예를 들어 실물 등록 화면에서는 `href="/admin/materials/list"`를 넣어서, 누르면 목록 화면으로 돌아가게 만들 거예요.

### 3-2. 번역 이름표 추가

`dictionary.ts`에서 방금 넣은 `"materials.copies.latestRegNo"` 줄들 바로 아래에 추가하세요.

**한글 쪽:**

```ts
    "admin.backButton": "뒤로 가기",
```

**영어 쪽:**

```ts
    "admin.backButton": "Back",
```

### 3-3. 실물 등록 화면에 적용

`admin/materials/copies/page.tsx` 맨 위 `import` 줄들 중에서, 아래 줄을 찾으세요.

```tsx
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";
```

그 **바로 아래**에 한 줄을 추가하세요.

```tsx
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";
import AdminBackButton from "@/components/admin-back-button";
```

그다음, 같은 파일에서 아래 부분을 찾으세요. (화면 맨 위, 자료 제목이 나오는 부분이에요.)

```tsx
      <h1 className="mb-1 text-lg font-bold">{material.title}</h1>
      <p className="mb-4 text-sm text-neutral-400">
        {material.creator || "-"} · {material.classNumber || "-"}
      </p>
```

이렇게 바꿔주세요. (제목과 뒤로 가기 버튼을 한 줄에 좌우로 배치합니다.)

```tsx
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold">{material.title}</h1>
        <AdminBackButton href="/admin/materials/list" />
      </div>
      <p className="mb-4 text-sm text-neutral-400">
        {material.creator || "-"} · {material.classNumber || "-"}
      </p>
```

---

## 4. 확인하기 — 약 5분

1. `admin/materials/list`에서 실물이 있는 자료의 **등록** 버튼을 눌러 실물 등록 화면으로 들어갑니다.
2. 오른쪽 폼에서 "실물 수정" 제목 옆에 있던 링크 글자가 **"입력 데이터 비우기"** 로 바뀌었는지 확인합니다.
3. **등록번호** 라벨 옆에 `(최근 등록: ...)` 처럼 가장 최근 등록번호가 표시되는지 확인합니다. 새로 실물을 하나 추가한 뒤 이 표시가 방금 추가한 번호로 바뀌는지도 확인해 보세요. 만약 항상 첫 번째로 등록했던 번호만 나오고 안 바뀐다면, 위 2번 항목의 ⚠️ 참고대로 `[0]`을 `[material.copies.length - 1]`로 바꿔주세요.
4. 화면 오른쪽 위(제목 옆)에 **"← 뒤로 가기"** 버튼이 보이고, 누르면 목록 화면으로 돌아가는지 확인합니다.

✅ 모두 확인되면 성공입니다! 🎉

---

## 5. GitHub에 저장하기 — 약 2분

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선(4): 실물 등록 UX 개선 (입력 데이터 비우기, 최근 등록번호, 뒤로 가기 버튼)"
git push
```

---

## 참고: 앞으로 만드는 관리자 화면 규칙

말씀하신 규칙을 기억해 둘게요 — **앞으로 새 관리자 화면을 만들 때마다, 왼쪽 사이드바 메뉴를 눌러서 바로 들어가는 첫 화면이 아니라면** 위에서 만든 `AdminBackButton` 부품을 화면 오른쪽 위에 넣을게요. 예를 들어 다음 13단계(4)에서 사이드바를 "목록" 하나로 정리하고 나면, "자료 신규 등록"(`/admin/materials/new`) 화면도 목록 화면에서 한 번 더 들어가는 화면이 되니 뒤로 가기 버튼을 넣게 됩니다.

혹시 지금 바로 `admin/materials/new` 화면에도 뒤로 가기 버튼을 넣고 싶으시면, 그 파일의 현재 코드를 보여주세요 — 제가 정확히 어디에 넣을지 짚어서 다음 안내를 드릴게요. (지금 이 파일은 12단계 이후로 제가 직접 수정한 적이 없어서 최신 코드를 확인하고 진행하는 게 안전해요.)

---

## 최종 점검표

- [ ] `dictionary.ts` — `materials.copies.newEntry` 값 "입력 데이터 비우기"/"Clear Form"으로 변경
- [ ] `dictionary.ts` — `materials.copies.latestRegNo`, `admin.backButton` 한글/영어 추가
- [ ] `admin/materials/copies/page.tsx` — 등록번호 라벨 옆 최근 등록번호 표시
- [ ] `components/admin-back-button.tsx` 새 파일 생성
- [ ] `admin/materials/copies/page.tsx` — 상단에 뒤로 가기 버튼 적용
- [ ] 화면에서 이름 변경·최근 등록번호·뒤로 가기 버튼 모두 확인
- [ ] GitHub에 올림

---

완료되면 알려주세요. 그다음엔 예고했던 13단계 (4) 사이드바 메뉴 정리로 넘어가면 됩니다 (그때 `admin/materials/new` 화면에도 뒤로 가기 버튼을 함께 넣을 수 있어요).
