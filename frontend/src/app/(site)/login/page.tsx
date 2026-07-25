"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

const API_URL = "http://localhost:3001";

export default function LoginPage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const { login } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [redirectParam, setRedirectParam] = useState("");

  // 페이지가 열릴 때 주소창의 ?redirect=... 값을 읽어서 기억해둡니다.
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    if (r) setRedirectParam(r);
  }, []);

  async function handleLogin() {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      const data = await res.json();
      login({ token: data.token, userName: data.user.name, role: data.user.role });
      notify(t("login.welcome").replace("{name}", data.user.name), "success");
      const redirect = new URLSearchParams(window.location.search).get("redirect") || "/";
      router.push(redirectParam || "/");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("login.fail")), "error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleLogin();
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loginId">{t("login.id")}</Label>
              <Input
                id="loginId"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="cursor-pointer">
              {t("login.submit")}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-neutral-500">
            <Link
              href={redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"}
              className="hover:text-neutral-800"
            >
              {t("login.signupLink")}
            </Link>            
            <span className="text-neutral-300">|</span>
            <Link href="/find-id" className="hover:text-neutral-800">
              {t("login.findIdLink")}
            </Link>
            <span className="text-neutral-300">|</span>
            <Link href="/find-password" className="hover:text-neutral-800">
              {t("login.findPasswordLink")}
            </Link>
          </div>
          
        </CardContent>
      </Card>
    </main>
  );
}