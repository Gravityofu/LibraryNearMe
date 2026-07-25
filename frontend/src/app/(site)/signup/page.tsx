"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const API_URL = "http://localhost:3001";

// 숫자만 남기고, 3자리-4자리-4자리 모양으로 하이픈을 자동으로 붙여줍니다.
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 하이픈을 뺀 숫자가 정확히 11자리인지 확인합니다.
function isValidPhone(phone: string) {
  return phone.replace(/\D/g, "").length === 11;
}

// 이메일은 입력했을 때만(선택 항목이라) 형식을 확인합니다.
function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignupPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const { notify } = useNotify();

  async function handleSignup() {

    if (!isValidPhone(phone)) {
      notify("❌ " + t("signup.invalidPhone"), "error");
      return;
    }
    if (!isValidEmail(email)) {
      notify("❌ " + t("signup.invalidEmail"), "error");
      return;
    }

    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password, name, phone, email }),
    });
    if (res.ok) {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        login({ token: loginData.token, userName: loginData.user.name, role: loginData.user.role });
        notify(t("signup.success"), "success");
        const redirect = new URLSearchParams(window.location.search).get("redirect") || "/";
        router.push(redirect);
      } else {
        // 가입은 됐지만 자동 로그인만 실패한 드문 경우 — 로그인 화면으로 보냅니다.
        notify(t("signup.success"), "success");
        router.push("/login");
      }
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("signup.fail")), "error");
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("signup.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loginId">{t("signup.id")}</Label>
            <Input id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("signup.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t("signup.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">{t("signup.phone")}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="000-0000-0000"
              inputMode="numeric"
              maxLength={13}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("signup.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="cursor-pointer" onClick={handleSignup}>
            {t("signup.submit")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}