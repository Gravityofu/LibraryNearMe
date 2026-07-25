# 개선 (11) — 주소 입력에 카카오 우편번호 서비스 붙이기

> 목표: 회원 등록/수정 화면의 "주소" 입력을, 직접 타이핑하는 대신 **카카오(다음)
> 우편번호 서비스**로 검색해서 고르는 방식으로 바꿉니다. 주소를 고르면 그 값은
> 수정할 수 없게 비활성화되고, 그 아래에 "상세 주소"만 따로 입력할 수 있게 만듭니다.
> 소요 시간: 약 20분

---

## 오늘 만드는 것 (그림으로)

```
처음 화면
┌───────────────────────────────┐
│ 주소            [주소 찾기]     │
└───────────────────────────────┘

"주소 찾기" 클릭 → 카카오 우편번호 검색창이 뜸 → 주소 선택

선택 후 화면
┌───────────────────────────────┐
│ 주소            [주소 찾기]     │
│ [서울특별시 ... (수정 불가)]    │  ← 회색 배경, 수정 불가
│ [상세 주소를 입력하세요      ]  │  ← 직접 타이핑 가능, 선택 사항
└───────────────────────────────┘

이 상태에서 "주소 찾기"를 다시 눌러 새 주소를 고르면,
기존에 있던 주소·상세주소는 지워지고 새로 고른 주소로 채워집니다.
```

이 서비스는 **카카오(예전 다음) 우편번호 서비스**라는 무료 공개 서비스예요. 별도
회원가입이나 API 키 없이 스크립트 하나만 불러오면 바로 쓸 수 있습니다.
(참고: https://postcode.map.kakao.com/guide)

---

## `admin/members/page.tsx` 수정 — 약 18분

`frontend/src/app/admin/members/page.tsx` 를 엽니다.

### 1. import 추가

맨 위, 아래 부분을 찾으세요.

```tsx
"use client";

import { useState } from "react";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import { BirthDateField, isValidBirthDate } from "@/components/birth-date-field";
```

이렇게 바꿔주세요. (`Script`를 새로 불러와요. 카카오 우편번호 서비스가 제공하는
스크립트 파일을 화면에 불러오기 위한 Next.js 도구예요.)

```tsx
"use client";

import { useState } from "react";
import Script from "next/script";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import { BirthDateField, isValidBirthDate } from "@/components/birth-date-field";
```

### 2. EMPTY_FORM 수정

아래 부분을 찾으세요.

```tsx
const EMPTY_FORM = {
  loginId: "",
  password: "",
  name: "",
  phone: "",
  email: "",
  memberNo: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  address: "",
  role: "MEMBER",
  status: "ACTIVE",
};
```

`address: "",` 한 줄을 아래처럼 두 줄로 바꿔주세요. (검색으로 고른 주소와, 사람이
직접 입력하는 상세 주소를 따로 담을 거예요.)

```tsx
const EMPTY_FORM = {
  loginId: "",
  password: "",
  name: "",
  phone: "",
  email: "",
  memberNo: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  addressMain: "",
  addressDetail: "",
  role: "MEMBER",
  status: "ACTIVE",
};
```

### 3. 주소 찾기 버튼을 눌렀을 때 실행할 함수 추가

아래 부분을 찾으세요.

```tsx
// 이메일은 입력했을 때만(선택 항목이라) 형식을 확인합니다.
function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
```

바로 아래에 함수를 하나 추가하세요. (컴포넌트 바깥, 파일의 최상위 레벨에
추가하는 함수입니다.)

```tsx
// 카카오 우편번호 서비스 팝업을 엽니다. 주소를 고르면 onSelect로 그 값을 전달합니다.
function openAddressSearch(onSelect: (address: string) => void) {
  const daum = (window as any).daum;
  if (!daum || !daum.Postcode) {
    // 스크립트가 아직 다 안 불러와졌을 때
    alert("주소 검색 창을 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
    return;
  }
  new daum.Postcode({
    oncomplete: function (data: any) {
      // 도로명 주소가 있으면 그걸, 없으면 지번 주소를 사용합니다.
      const address = data.roadAddress || data.jibunAddress || data.address;
      onSelect(address);
    },
  }).open();
}
```

- `(window as any).daum` 은 잠시 뒤 4번에서 불러올 카카오 스크립트가 만들어주는
  전역 도구예요. 스크립트가 다 불러와지기 전에 버튼을 누르면 안내 문구를 띄웁니다.

### 4. `openEditModal`에서 기존 주소 채우기

아래 부분을 찾으세요.

```tsx
      birthYear: by,
      birthMonth: bm,
      birthDay: bd,
      address: row.address || "",
      role: row.role,
      status: row.status,
```

이렇게 바꿔주세요.

```tsx
      birthYear: by,
      birthMonth: bm,
      birthDay: bd,
      addressMain: row.address || "",
      addressDetail: "",
      role: row.role,
      status: row.status,
```

> 예전에 저장된 주소는 "본 주소 + 상세 주소"가 구분 없이 하나로 저장돼 있어서,
> 수정 화면을 열면 일단 전체 내용이 (수정 불가) 주소 칸에 그대로 나타나요. 상세
> 주소를 다시 나누고 싶다면 "주소 찾기"로 새로 검색해서 채우면 됩니다.

### 5. 저장할 때 두 값을 하나로 합치기

아래 부분을 찾으세요.

```tsx
    const birthDateValue = allBirthFilled
      ? `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`
      : undefined;

    const url = editingId ? `${API_URL}/users/${editingId}` : `${API_URL}/users/admin`;
```

이렇게 바꿔주세요. (주소 + 상세 주소를 공백 하나로 이어붙여서, 서버로 보낼 때는
지금처럼 하나의 문자열로 보냅니다. 서버 쪽 코드는 손댈 필요가 없어요.)

```tsx
    const birthDateValue = allBirthFilled
      ? `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`
      : undefined;

    const address = [form.addressMain, form.addressDetail].filter((v) => v.trim()).join(" ");

    const url = editingId ? `${API_URL}/users/${editingId}` : `${API_URL}/users/admin`;
```

### 6. 서버로 보내는 값 바꾸기

아래 부분을 찾으세요. (`address: form.address,` 가 두 군데 나와요 — **둘 다**
바꿔주세요.)

```tsx
          address: form.address,
```

두 곳 모두 이렇게 바꿔주세요.

```tsx
          address,
```

### 7. 주소 입력칸을 검색 방식으로 바꾸기

아래 부분을 찾으세요.

```tsx
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.address")}</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
```

이렇게 바꿔주세요.

```tsx
              <label className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-neutral-500">{t("members.form.field.address")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      openAddressSearch((address) => setForm((prev) => ({ ...prev, addressMain: address, addressDetail: "" })))
                    }
                    className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                  >
                    {t("members.form.findAddressBtn")}
                  </button>
                </div>
                {form.addressMain && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={form.addressMain}
                      disabled
                      className="w-full rounded-lg border bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                    />
                    <input
                      value={form.addressDetail}
                      onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                      placeholder={t("members.form.addressDetailPlaceholder")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </label>
```

- 주소를 아직 안 골랐으면(`form.addressMain`이 빈 값이면) "주소 찾기" 버튼만 보여요.
- 주소를 고르면 그 아래에 (수정 불가) 주소 칸과 상세 주소 입력칸이 나타나요.
- 다시 "주소 찾기"를 누르면 `addressMain`과 `addressDetail`을 둘 다 새로 채워 넣어서,
  이전에 입력했던 상세 주소도 함께 지워집니다.

### 8. 카카오 우편번호 스크립트 불러오기

아래 부분을 찾으세요. (`return` 바로 다음 줄이에요.)

```tsx
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* 상단 버튼 영역 */}
```

이렇게 바꿔주세요. (카카오가 제공하는 스크립트 파일을 이 화면에서 한 번 불러옵니다.)

```tsx
  return (
    <div className="flex flex-col gap-4 p-6">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      {/* 상단 버튼 영역 */}
```

---

## dictionary.ts에 문구 추가 — 약 3분

`frontend/src/lib/dictionary.ts` 를 엽니다. `"members.form.field.address"` 줄
근처(한글·영어 각각)에 아래 두 줄씩 추가하세요.

**한글 쪽:**

```ts
    "members.form.findAddressBtn": "주소 찾기",
    "members.form.addressDetailPlaceholder": "상세 주소",
```

**영어 쪽:**

```ts
    "members.form.findAddressBtn": "Find address",
    "members.form.addressDetailPlaceholder": "Detailed address",
```

---

## 확인하기 — 약 6분

1. "회원" → "등록" 화면을 열면 "주소" 옆에 "주소 찾기" 버튼만 보이고, 아래에
   입력칸은 아직 없는지 확인합니다.
2. "주소 찾기"를 누르면 카카오 우편번호 검색 팝업이 뜨는지 확인합니다.
3. 주소를 하나 검색해서 선택하면, 팝업이 닫히고 (수정 불가, 회색) 주소 칸과 그
   아래에 "상세 주소" placeholder가 있는 입력칸이 나타나는지 확인합니다.
4. 상세 주소 칸에 직접 글자를 입력할 수 있는지 확인합니다.
5. 다시 "주소 찾기"를 눌러 다른 주소를 선택하면, 기존 주소·상세주소 값이 지워지고
   새로 고른 주소로 바뀌는지 확인합니다.
6. 상세 주소를 비워둔 채로 저장해도 정상적으로 저장되는지 확인합니다(필수 아님).
7. 저장 후 다시 "수정"으로 열면 주소 칸에 이전에 저장한 값이 들어있는지 확인합니다.

✅ 모두 확인되면 성공입니다! 🎉

---

## GitHub에 저장하기 — 약 2분

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선(11): 회원 주소 입력에 카카오 우편번호 서비스 연결"
git push
```

---

## 최종 점검표

- [ ] `Script` import 추가
- [ ] `EMPTY_FORM` — `address` → `addressMain`/`addressDetail`
- [ ] `openAddressSearch()` 함수 추가
- [ ] `openEditModal` — `addressMain`/`addressDetail` 채우기
- [ ] `handleSave` — 주소 합치기 + 서버 전송 값(`address` 두 곳) 수정
- [ ] 주소 입력칸을 검색 버튼 + (선택 후) 비활성 칸 + 상세 주소 칸으로 교체
- [ ] `<Script .../>` 태그 추가
- [ ] `dictionary.ts` 문구 한글/영어 추가
- [ ] 주소 검색 → 선택 → 표시 확인
- [ ] 재검색 시 기존 값 지워지고 새 값으로 교체되는지 확인
- [ ] GitHub에 올림

---

## 다음 단계

원하시면 홈페이지 회원가입 화면(`/signup`)에도 같은 방식의 주소 검색을 붙여
드릴게요. 완료되면 알려주세요!
