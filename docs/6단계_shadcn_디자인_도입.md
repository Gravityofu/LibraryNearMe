# 6단계 — shadcn 디자인으로 관리자 페이지 단장하기

> 목표: 5단계에서 만든 투박한 관리자 페이지를, shadcn의 예쁜 부품으로 바꿉니다.
> 기능은 그대로, 모습만 전문적으로!
> 소요 시간: 약 40분

---

## shadcn이 뭔가요?

shadcn(섀드씨엔)은 **미리 예쁘게 디자인된 화면 부품 모음**입니다. 버튼, 입력창, 카드, 달력, 표 같은 것들이 이미 세련되게 만들어져 있어요. 우리는 그걸 가져다 쓰기만 하면 됩니다.

일반 가구점과 다른 점이 하나 있어요. 보통 UI 라이브러리는 "가구를 빌려 쓰는" 방식이라 내 맘대로 못 고칩니다. 그런데 shadcn은 **부품을 아예 내 프로젝트 안으로 복사해 넣어줘요.** 그래서 색이든 모양이든 내가 자유롭게 뜯어고칠 수 있습니다. 지침에 "도서관마다 색상을 다르게"라는 요구가 있었죠? 이런 자유로운 수정이 가능한 shadcn이 그 목적에 잘 맞습니다.

오늘은 shadcn을 설치하고, 5단계 관리자 페이지의 평범한 입력창·버튼을 shadcn 부품으로 갈아끼웁니다.

---

## 준비

- 터미널 1 (주방): backend에서 `npm run start:dev`
- 터미널 2 (홀): frontend에서 `npm run dev`

두 서버를 켜두세요. 그리고 shadcn 명령을 실행할 **세 번째 터미널**도 하나 준비하면 편합니다.

---

## 1. shadcn 설치하기 (초기 설정) — 약 10분

**중요: 반드시 `frontend` 폴더 안에서** 실행해야 합니다. (shadcn은 홀 쪽 도구라서요.)

```
cd C:\projects\LibraryNearMe\frontend
npx shadcn@latest init
```

- 만약 `Need to install the following packages... Ok to proceed? (y)` 라고 물으면 `y`를 입력하고 Enter.
- 그다음 **기본 색상(base color)** 을 고르라는 질문이 나옵니다. 화살표 키(↑↓)로 원하는 걸 고르고 Enter를 누르세요. 처음이라면 **`Neutral`**(무채색) 을 추천합니다. (나중에 언제든 바꿀 수 있어요.)
- 그 외 다른 질문이 나오면 그냥 **Enter**를 눌러 기본값을 받아들이면 됩니다.

이 명령이 하는 일: 화면 부품들을 담을 준비를 하고(폴더 만들기), 색상 테마를 설정 파일에 적어둡니다.

✅ **확인하기**: `frontend` 폴더 안에 `components.json` 이라는 파일이 새로 생기고, `src/lib/utils.ts` 파일도 생기면 준비 완료입니다.

---

## 2. 필요한 부품 가져오기 — 약 5분

이제 오늘 쓸 부품 4개를 가져옵니다. 한 줄로 한꺼번에 받을 수 있어요. (frontend 폴더에서)

```
npx shadcn@latest add button input label card
```

- `button`: 버튼
- `input`: 입력창
- `label`: 입력창 위에 붙는 이름표
- `card`: 내용을 담는 예쁜 카드 상자

✅ **확인하기**: `frontend` → `src` → `components` → `ui` 폴더가 생기고, 그 안에 `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx` 파일들이 보이면 성공입니다. (이게 바로 "부품이 내 프로젝트 안으로 들어왔다"는 뜻이에요.)

---

## 3. 관리자 페이지를 shadcn 부품으로 바꾸기 — 약 15분

`frontend` → `src` → `app` → `admin` → **`page.tsx`** 를 엽니다. 내용을 **전부 지우고** 아래로 통째로 바꿔주세요.

> 걱정 마세요. 저장하고 불러오는 **기능(로직)은 5단계와 완전히 똑같습니다.** 화면을 그리는 부분만 평범한 태그(`<input>`, `<button>`) 대신 shadcn 부품(`<Input>`, `<Button>`)으로 바뀐 거예요. 대문자로 시작하면 shadcn 부품, 소문자면 평범한 기본 태그입니다.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = "http://localhost:3001";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [status, setStatus] = useState("");

  // 페이지가 열릴 때 현재 설정을 불러옵니다. (5단계와 동일)
  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setPrimaryColor(data.primaryColor);
        }
      });
  }, []);

  // 저장 버튼을 눌렀을 때. (5단계와 동일)
  async function handleSave() {
    setStatus("저장 중...");
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, primaryColor }),
    });
    setStatus(
      res.ok
        ? "✅ 저장되었습니다! 홈페이지에서 확인해 보세요."
        : "❌ 저장에 실패했습니다."
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>도서관 설정 (관리자)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">도서관 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="color">대표 색상</Label>
            <Input
              id="color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>

          <Button onClick={handleSave}>저장하기</Button>

          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}
```

여기서 새로 나온 것들:
- `className="..."` → Tailwind라는 도구로 크기·여백·정렬을 지정하는 방식입니다. 예: `max-w-md`(최대 너비), `p-8`(안쪽 여백), `flex flex-col gap-4`(세로로 나란히, 사이 간격). 지금은 "이런 식으로 꾸미는구나" 정도만 느끼시면 됩니다.
- `<Card>`, `<Input>`, `<Button>` → 우리가 방금 가져온 shadcn 부품들입니다.

---

## 4. 확인하기 — 예뻐진 화면 보기 — 약 5분

브라우저에서 관리자 페이지를 새로고침합니다: `http://localhost:3000/admin`

✅ **확인하기**: 입력창과 버튼이 **깔끔한 카드 안에 담긴 세련된 모습**으로 바뀌었으면 성공입니다! 🎉

그리고 기능이 그대로인지도 확인해 봅시다.
1. 도서관 이름을 바꾸고 색상도 고른 뒤 **저장하기**를 누릅니다.
2. "✅ 저장되었습니다" 가 뜨는지 봅니다.
3. 홈페이지(`localhost:3000`)를 새로고침해서 값이 바뀌었는지 확인합니다.

기능은 그대로 작동하면서 모습만 예뻐졌다면, shadcn 도입 성공입니다!

> 만약 화면이 안 뜨거나 `Module not found: @/components/ui/...` 같은 에러가 나면, 2번의 부품 가져오기가 제대로 됐는지(그 파일들이 실제로 있는지) 확인하세요. 에러 메시지를 복사해서 보내주셔도 됩니다.

---

## 5. GitHub에 저장하기 — 약 5분

서버가 도는 터미널 말고 다른 터미널에서:

```
cd C:\projects\LibraryNearMe
git status
```

🔒 `.env`가 목록에 없는지 확인 후:

```
git add .
git commit -m "6단계: shadcn 디자인 도입, 관리자 페이지 UI 개선"
git push
```

✅ **확인하기**: GitHub에 `frontend/src/components/ui` 폴더와 `components.json`이 보이면 6단계 완료입니다! 🎉

---

## 최종 점검표

- [ ] `frontend`에서 `shadcn init` 실행, `components.json` 생성됨
- [ ] `button input label card` 부품 4개 추가됨 (`src/components/ui`에 파일 생김)
- [ ] `admin/page.tsx`를 shadcn 부품으로 교체
- [ ] `/admin` 화면이 세련된 카드 모습으로 바뀜
- [ ] 저장 기능이 여전히 잘 작동함
- [ ] GitHub에 올림 (`.env`는 안 올라감)

---

## 지금까지 온 길 되돌아보기

6단계까지 오면서 조제님은 이런 걸 다 해내셨어요.
- 개발 환경 구축(1) → 두 서버 만들기(2) → 데이터베이스 연결(3) → 화면에 표시(4) → 수정·저장(5) → 디자인(6)

이제 시스템의 **기본 뼈대와 작동 원리**가 완성됐습니다. 데이터를 만들고(Create), 읽고(Read), 고치고(Update) 하는 웹 시스템의 핵심을 도서관 설정으로 한 바퀴 다 경험하신 거예요.

## 다음 단계 예고 — 7단계

이제 진짜 도서관 기능을 시작합니다! 지침의 첫 번째 핵심 기능인 **책(도서) 관리**예요. 책 정보를 담을 새 표(Book)를 만들고, 관리자 페이지에서 책을 등록하고 목록을 보는 기능을 만듭니다. 지금까지 도서관 설정으로 익힌 흐름(모델 → 창구 → 화면)을 그대로 반복하는 거라, 한결 수월하게 느껴지실 거예요. 완료되면 알려주세요!
