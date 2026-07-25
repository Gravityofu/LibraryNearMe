# 17단계 (1) — 홈페이지 Footer 추가 (관리자 설정과 연동)

> 목표: 홈페이지 맨 아래에 관리자 사이드바와 같은 짙은 회색 바탕 Footer를
> 추가합니다. 도서관 로고·이름·이용약관·개인정보처리방침·버전·저작권 문구가
> 한 줄에 나옵니다. 색상과 버전·저작권 문구는 코드에 직접 박아넣지 않고
> **관리자 페이지 → 설정**에서 바꾸면 자동으로 반영되도록 만듭니다.
> 소요 시간: 약 40분

---

## 오늘 만드는 것 (그림으로)

```
관리자 페이지 → 설정 화면에 입력칸 추가
┌─────────────────────────────┐
│ 도서관 이름   [ ... ]         │
│ 대표 색상     [■]             │
│ 로고 이미지 주소 [ ... ]       │  ← 오늘 추가
│ Footer 배경색  [■]            │  ← 오늘 추가
│ Footer 글자색  [■]            │  ← 오늘 추가
│ 버전          [ 1.0.0 ]       │  ← 오늘 추가
│ 저작권 문구    [ⓒ 2026 ...]   │  ← 오늘 추가
│         [저장하기]             │
└─────────────────────────────┘
        │ 저장하면 DB에 저장됨
        ▼
홈페이지 맨 아래 (짙은 회색 바탕, 관리자 설정 값 그대로 사용)
┌──────────────────────────────────────────────────────────┐
│ [로고] 도서관이름   이용 약관   개인정보 처리방침    버전 1.0.0  ⓒ 2026 Gravityofu │
└──────────────────────────────────────────────────────────┘
```

이렇게 만들면, 나중에 관리자 설정에서 색상이나 버전 문구를 바꾸면 홈페이지
Footer도 코드를 다시 건드릴 필요 없이 **자동으로 바뀝니다.** 오늘부터는 이런
색상·문구들을 화면 코드에 `"#383838"` 처럼 직접 적지 않고, 이렇게 **DB에서
가져온 값을 변수로 써서** 화면에 뿌려주는 방식으로 만들어요.

---

## 1. 설계도(schema.prisma)에 칸 추가하기 — 약 8분

`backend/prisma/schema.prisma` 를 엽니다. `model Library { ... }` 블록을 찾아서,
아래처럼 다섯 줄을 추가하세요. (`logoUrl`은 이미 있으니 그대로 두고, 그 아래
네 줄만 새로 추가합니다.)

```prisma
model Library {
  id              Int      @id @default(autoincrement())
  name            String
  logoUrl         String?
  primaryColor    String   @default("#2563eb")
  domain          String?  @unique
  chromeBgColor   String   @default("#383838")             // 오늘 추가: Footer/사이드바 배경색
  chromeTextColor String   @default("#F9F6F0")              // 오늘 추가: Footer/사이드바 글자색
  footerVersion   String   @default("1.0.0")                // 오늘 추가: Footer에 보일 버전
  footerCopyright String   @default("ⓒ 2026 Gravityofu")    // 오늘 추가: Footer에 보일 저작권 문구
  createdAt       DateTime @default(now())

  users        User[]
}
```

> ⚠️ 기존에 있던 `id`, `name`, `logoUrl`, `primaryColor`, `domain`, `createdAt`,
> `users` 줄은 그대로 두고, `chromeBgColor` ~ `footerCopyright` 네 줄만 새로
> 끼워 넣는 거예요. 순서는 크게 상관없지만 위 예시처럼 넣으면 됩니다.

터미널에서 backend 폴더로 가서 마이그레이션을 실행하세요.

```
cd C:\projects\LibraryNearMe\backend
npx prisma migrate dev --name add_footer_settings
```

✅ **확인하기**: 에러 없이 끝나면 성공입니다. 이미 있던 도서관 정보에는 자동으로
기본값(`#383838`, `#F9F6F0`, `1.0.0`, `ⓒ 2026 Gravityofu`)이 채워져요.

---

## 2. 백엔드 — 저장 API에 새 칸 반영하기 — 약 5분

`backend/src/library/library.service.ts` 를 엽니다. 전체를 아래로 통째로
바꿔주세요.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // 도서관 설정 가져오기
  getLibrary() {
    return this.prisma.library.findFirst();
  }

  // 도서관 설정 바꿔서 저장하기
  async updateLibrary(data: {
    name: string;
    primaryColor: string;
    logoUrl?: string;
    chromeBgColor?: string;
    chromeTextColor?: string;
    footerVersion?: string;
    footerCopyright?: string;
  }) {
    const library = await this.prisma.library.findFirst();
    if (!library) return null;

    return this.prisma.library.update({
      where: { id: library.id },
      data: {
        name: data.name,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || undefined,
        chromeBgColor: data.chromeBgColor || undefined,
        chromeTextColor: data.chromeTextColor || undefined,
        footerVersion: data.footerVersion || undefined,
        footerCopyright: data.footerCopyright || undefined,
      },
    });
  }
}
```

`backend/src/library/library.controller.ts` 를 엽니다. 아래 부분을 찾으세요.

```typescript
  @UseGuards(AdminGuard)
  @Patch()
  updateLibrary(@Body() body: { name: string; primaryColor: string }) {
    return this.libraryService.updateLibrary(body);
  }
```

이렇게 바꿔주세요.

```typescript
  @UseGuards(AdminGuard)
  @Patch()
  updateLibrary(@Body() body: any) {
    return this.libraryService.updateLibrary(body);
  }
```

저장하면 backend가 재시작됩니다.

---

## 3. dictionary.ts에 문구 추가 — 약 3분

`frontend/src/lib/dictionary.ts` 를 엽니다. `"admin.settings.saveFail"` 줄
바로 아래(한글·영어 각각)에 추가하세요.

**한글 쪽:**

```ts
    "admin.settings.logoUrl": "로고 이미지 주소",
    "admin.settings.chromeBgColor": "Footer/사이드바 배경색",
    "admin.settings.chromeTextColor": "Footer/사이드바 글자색",
    "admin.settings.footerVersion": "버전",
    "admin.settings.footerCopyright": "저작권 문구",
    "footer.terms": "이용 약관",
    "footer.privacy": "개인정보 처리방침",
```

**영어 쪽:**

```ts
    "admin.settings.logoUrl": "Logo Image URL",
    "admin.settings.chromeBgColor": "Footer/Sidebar Background Color",
    "admin.settings.chromeTextColor": "Footer/Sidebar Text Color",
    "admin.settings.footerVersion": "Version",
    "admin.settings.footerCopyright": "Copyright Text",
    "footer.terms": "Terms of Use",
    "footer.privacy": "Privacy Policy",
```

---

## 4. 관리자 설정 화면에 입력칸 추가 — 약 8분

`frontend/src/app/admin/page.tsx` 를 엽니다. 전체를 아래로 통째로 바꿔주세요.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = "http://localhost:3001";

export default function AdminPage() {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoUrl, setLogoUrl] = useState("");
  const [chromeBgColor, setChromeBgColor] = useState("#383838");
  const [chromeTextColor, setChromeTextColor] = useState("#F9F6F0");
  const [footerVersion, setFooterVersion] = useState("1.0.0");
  const [footerCopyright, setFooterCopyright] = useState("ⓒ 2026 Gravityofu");
  const { notify } = useNotify();

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setChecked(true);
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setPrimaryColor(data.primaryColor);
          setLogoUrl(data.logoUrl || "");
          setChromeBgColor(data.chromeBgColor || "#383838");
          setChromeTextColor(data.chromeTextColor || "#F9F6F0");
          setFooterVersion(data.footerVersion || "1.0.0");
          setFooterCopyright(data.footerCopyright || "ⓒ 2026 Gravityofu");
        }
      });
  }, []);

  async function handleSave() {
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        primaryColor,
        logoUrl,
        chromeBgColor,
        chromeTextColor,
        footerVersion,
        footerCopyright,
      }),
    });
    if (res.ok) {
      notify(t("admin.settings.saved"), "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("admin.settings.saveFail")), "error");
    }
  }

  if (!checked) return null;

  if (!token) {
    return (
      <main className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.pageTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>{t("admin.needLogin")}</p>
            <a href="/login">
              <Button className="cursor-pointer">{t("admin.goLogin")}</Button>
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t("admin.settings.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="color">{t("admin.settings.color")}</Label>
            <Input id="color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="logoUrl">{t("admin.settings.logoUrl")}</Label>
            <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="chromeBg">{t("admin.settings.chromeBgColor")}</Label>
            <Input
              id="chromeBg"
              type="color"
              value={chromeBgColor}
              onChange={(e) => setChromeBgColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="chromeText">{t("admin.settings.chromeTextColor")}</Label>
            <Input
              id="chromeText"
              type="color"
              value={chromeTextColor}
              onChange={(e) => setChromeTextColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="footerVersion">{t("admin.settings.footerVersion")}</Label>
            <Input id="footerVersion" value={footerVersion} onChange={(e) => setFooterVersion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="footerCopyright">{t("admin.settings.footerCopyright")}</Label>
            <Input id="footerCopyright" value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} />
          </div>
          <Button className="cursor-pointer" onClick={handleSave}>
            {t("admin.settings.save")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

- `chromeBgColor`/`chromeTextColor`는 이름 그대로 "짙은 색 화면 틀(chrome)"에
  쓰는 배경색·글자색이에요. 관리자 사이드바에 이미 쓰이고 있는 색과 같은
  값(`#383838`/`#F9F6F0`)을 기본값으로 넣어뒀어요.
- 로고는 아직 파일 업로드 기능이 없어서, 우선은 이미지 주소(URL)를 직접
  입력하는 방식으로 만들었어요. (예: 다른 곳에 올려둔 이미지 링크)

---

## 5. Footer 부품(컴포넌트) 만들기 — 약 8분

`frontend/src/components` 폴더 안에 **`site-footer.tsx`** 파일을 새로 만들고
아래 내용을 붙여넣습니다.

```tsx
import Link from "next/link";

type Props = {
  name: string;
  logoUrl?: string | null;
  bgColor: string;
  textColor: string;
  version: string;
  copyright: string;
  termsLabel: string;
  privacyLabel: string;
};

export default function SiteFooter({
  name,
  logoUrl,
  bgColor,
  textColor,
  version,
  copyright,
  termsLabel,
  privacyLabel,
}: Props) {
  return (
    <footer className="mt-8 w-full" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {logoUrl && <img src={logoUrl} alt={name} className="h-6 w-auto" />}
          <span className="font-semibold">{name}</span>
          <Link href="/terms" className="opacity-70 hover:opacity-100">
            {termsLabel}
          </Link>
          <Link href="/privacy" className="opacity-70 hover:opacity-100">
            {privacyLabel}
          </Link>
        </div>
        <div className="flex items-center gap-3 opacity-70">
          <span>버전 {version}</span>
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
```

- 배경색·글자색·버전·저작권 문구를 전부 **props(바깥에서 넘겨받는 값)** 로
  받아요. 색깔이나 문구를 이 파일 안에 직접 적지 않았기 때문에, 관리자 설정에서
  값을 바꾸면 이 컴포넌트는 코드 수정 없이 새 값을 그대로 보여줘요.
- 로고 주소가 없으면(`logoUrl`이 비어있으면) 이미지를 아예 표시하지 않아요.

---

## 6. 안내 페이지 두 개 만들기 — 약 3분

지금은 "이용 약관"·"개인정보 처리방침" 페이지가 없어서, 링크를 눌러도 빈
화면(404)이 나와요. 우선 안내 문구만 있는 간단한 페이지를 만들어둡니다.

`frontend/src/app/(site)/terms` 폴더를 새로 만들고, 그 안에 `page.tsx` 를
만들어 붙여넣으세요.

```tsx
export default function TermsPage() {
  return (
    <main className="rounded-xl border border-neutral-200 bg-white p-8">
      <h1 className="mb-4 text-lg font-bold">이용 약관</h1>
      <p className="text-sm text-neutral-500">이용 약관 내용은 준비 중입니다.</p>
    </main>
  );
}
```

`frontend/src/app/(site)/privacy` 폴더를 새로 만들고, 그 안에 `page.tsx` 를
만들어 붙여넣으세요.

```tsx
export default function PrivacyPage() {
  return (
    <main className="rounded-xl border border-neutral-200 bg-white p-8">
      <h1 className="mb-4 text-lg font-bold">개인정보 처리방침</h1>
      <p className="text-sm text-neutral-500">개인정보 처리방침 내용은 준비 중입니다.</p>
    </main>
  );
}
```

> 실제 약관·방침 내용은 나중에 채우면 됩니다. 오늘은 링크가 끊기지 않도록
> 자리만 만들어두는 거예요.

---

## 7. `(site)/layout.tsx`에 Footer 연결하기 — 약 5분

`frontend/src/app/(site)/layout.tsx` 를 엽니다. 전체를 아래로 통째로
바꿔주세요.

```tsx
import SiteSidebar from "@/components/site-sidebar";
import SiteFooter from "@/components/site-footer";
import RecentPosts from "@/components/recent-posts";

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

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const library = await getLibrary();
  const name = library?.name ?? "도서관";

  return (
    <div>
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 p-5 md:grid-cols-[230px_1fr_230px] md:items-start">
        <SiteSidebar name={name} primaryColor={library?.primaryColor} />
        <div>{children}</div>
        <RecentPosts />
      </div>
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

> 이 파일은 서버 컴포넌트라서(`useI18n` 같은 훅을 못 써서) 이용약관/개인정보
> 처리방침 문구는 지금은 한글로 고정해뒀어요. 나중에 언어 전환까지 맞추고
> 싶으시면 말씀해주세요.

---

## 8. 확인하기 — 약 5분

1. 홈페이지 맨 아래에 짙은 회색 바탕의 Footer가 한 줄로 나오는지 확인합니다.
   (로고는 주소를 아직 안 넣었으면 안 보이는 게 정상입니다.)
2. "이용 약관"/"개인정보 처리방침"을 클릭하면 안내 페이지로 이동하는지
   확인합니다.
3. 오른쪽에 "버전 1.0.0"과 "ⓒ 2026 Gravityofu"가 나오는지 확인합니다.
4. 관리자 페이지 → 설정 화면에 새 입력칸 5개(로고 주소/Footer 배경색/Footer
   글자색/버전/저작권 문구)가 보이는지 확인합니다.
5. Footer 배경색을 다른 색(예: 남색)으로 바꾸고 저장한 뒤, 홈페이지를 새로고침
   하면 Footer 배경색이 바뀌는지 확인합니다.
6. 버전을 "1.1.0"으로 바꾸고 저장한 뒤, 홈페이지 Footer에 "버전 1.1.0"으로
   바뀌는지 확인합니다.
7. 로고 이미지 주소를 넣고 저장한 뒤, Footer 왼쪽에 로고가 나오는지 확인합니다.

✅ 모두 확인되면 성공입니다! 🎉

---

## 9. GitHub에 저장하기 — 약 2분

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "17단계(1): 홈페이지 Footer 추가, 색상/버전/저작권을 관리자 설정에서 제어하도록 변경"
git push
```

---

## 최종 점검표

- [ ] `schema.prisma` — `chromeBgColor`/`chromeTextColor`/`footerVersion`/`footerCopyright` 추가
- [ ] `migrate dev --name add_footer_settings` 성공
- [ ] `library.service.ts`/`library.controller.ts` — 새 칸 저장 반영
- [ ] `dictionary.ts` — 관련 문구 한글/영어 추가
- [ ] `admin/page.tsx` — 새 입력칸 5개 추가
- [ ] `components/site-footer.tsx` 새로 생성
- [ ] `(site)/terms/page.tsx`, `(site)/privacy/page.tsx` 새로 생성
- [ ] `(site)/layout.tsx` — Footer 연결
- [ ] Footer 한 줄 표시 확인
- [ ] 관리자 설정에서 색상/버전 바꾸면 Footer에 반영되는지 확인
- [ ] GitHub에 올림

---

## 앞으로의 색상 원칙 (기억해두세요)

오늘부터는 화면 어딘가의 색상이나 "버전 1.0.0" 같은 고정 문구를 새로 추가할
때, `"#383838"`처럼 코드에 직접 적지 않고 **오늘처럼 관리자 설정(DB)에서
값을 가져와 변수로 쓰는 방식**을 기본으로 할게요. 관리자 사이드바처럼
이미 오래전에 만들어서 하드코딩되어 있는 부분들은 나중에 시간 날 때 한 번에
정리해도 되고, 원하시면 다음 단계에서 바로 정리해 드릴 수도 있어요.

## 다음 단계 예고

원하시면 관리자 사이드바(`admin/layout.tsx`)도 오늘 만든 `chromeBgColor`/
`chromeTextColor` 설정값을 그대로 쓰도록 연결해서, Footer랑 완전히 같은 값을
공유하게 만들 수 있어요. 완료되면 알려주세요!
