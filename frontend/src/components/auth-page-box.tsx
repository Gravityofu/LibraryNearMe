"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";

const API_URL = "http://localhost:3001";

type Props = {
  title: string;
  children: React.ReactNode;
};

// 로그인/회원가입/아이디 찾기/비밀번호 찾기 화면이 공통으로 쓰는 박스입니다.
// 맨 위에 도서관 로고+이름, 그 아래 줄에 화면 제목과 "뒤로 가기" 버튼을 보여줍니다.
export default function AuthPageBox({ title, children }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("도서관");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setLogoUrl(data.logoUrl || null);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardContent className="pt-6">
          <Link href="/" className="mb-5 flex flex-col items-center gap-1.5">
            {logoUrl && <img src={logoUrl} alt={name} className="h-9 w-auto" />}
            <span className="text-base font-extrabold">{name}</span>
          </Link>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold">{title}</h1>
            <button
              type="button"
              onClick={() => router.back()}
              className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              {t("auth.backBtn")}
            </button>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}