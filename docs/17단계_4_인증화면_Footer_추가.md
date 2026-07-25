# 17단계 (4) — 로그인 계열 화면에 Footer 추가

> 목표: `/login`, `/signup`, `/find-id`, `/find-password` 네 화면에도 다른
> 화면들처럼 맨 아래에 Footer가 나오게 합니다. 가운데 박스 내용이 짧아도
> Footer는 항상 화면 맨 아래에 붙어있게 만듭니다.
> 소요 시간: 약 8분

---

## 오늘 만드는 것 (그림으로)

```
┌──────────────────────────┐
│                            │
│      [로고] 도서관이름         │
│      로그인      [뒤로가기]    │
│      (입력 폼)               │
│                            │  ← 내용이 짧아도 이 공간이 늘어남
│                            │
├──────────────────────────┤
│ [로고] 도서관이름  이용약관 ...  │  ← Footer (항상 맨 아래)
└──────────────────────────┘
```

---

## `app/(auth)/layout.tsx` 수정 — 약 8분

`frontend/src/app/(auth)/layout.tsx` 를 엽니다. 전체 내용을 아래로 통째로
바꿔주세요. (17단계 1에서 만든 `SiteFooter` 부품을 그대로 가져다 씁니다.
도서관 정보를 가져오는 부분도 `(site)/layout.tsx`와 똑같아요.)

```tsx
import SiteFooter from "@/components/site-footer";

const API_URL = "http://localhost:3001";

async function getLibrary() {
  try {
    const res = await fetch(`${API_URL}/library`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const library = await getLibrary();
  const name = library?.name ?? "도서관";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <SiteFooter
        name={name}
        logoUrl={library?.logoUrl}
        bgColor={library?.chromeBgColor || "#383838"}
        textColor={library?.chromeTextColor || "#F9F6F0"}
        version={library?.footerVersion || "1.0.0"}
        copyright={library?.footerCopyright || "ⓒ 2026 Gravityofu"}
        termsLabel="이용 약관"
        privacyLabel="개인정보 처리방침"
      />
    </div>
  );
}
```

- `flex min-h-screen flex-col`: 화면 전체를 세로로 쌓아요. 위쪽은 내용, 아래쪽은
  Footer.
- `flex flex-1 items-center justify-center`: 내용 영역이 남는 공간을 다
  차지하면서, 그 안에서 가운데 박스를 화면 가운데로 정렬해요. 그래서 내용이
  짧아도 Footer는 항상 화면 맨 아래에 붙어있게 됩니다.

---

## 확인하기 — 약 3분

1. `/login`, `/signup`, `/find-id`, `/find-password` 네 화면 모두 맨 아래에
   Footer(짙은 회색 바탕)가 보이는지 확인합니다.
2. 화면 높이가 넉넉한 모니터에서도 Footer가 화면 맨 아래에 붙어있는지
   확인합니다. (내용이 짧다고 화면 중간에 떠 있으면 안 돼요.)
3. Footer 안의 "이용 약관"/"개인정보 처리방침" 링크가 잘 동작하는지
   확인합니다.

✅ 모두 확인되면 성공입니다! 🎉

---

## GitHub에 저장하기 — 약 2분

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "17단계(4): 로그인 계열 화면(로그인/회원가입/아이디찾기/비밀번호찾기)에 Footer 추가"
git push
```

---

## 최종 점검표

- [ ] `app/(auth)/layout.tsx` — `SiteFooter` 연결
- [ ] 네 화면 모두 Footer가 맨 아래에 보이는지 확인
- [ ] 내용이 짧아도 Footer가 화면 하단에 고정되는지 확인
- [ ] GitHub에 올림

완료되면 알려주세요!
