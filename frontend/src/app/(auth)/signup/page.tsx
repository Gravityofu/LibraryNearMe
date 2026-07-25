"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { useAuth } from "@/components/auth-provider";
import AuthPageBox from "@/components/auth-page-box";

const API_URL = "http://localhost:3001";

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidPhone(phone: string) {
  return phone.replace(/\D/g, "").length === 11;
}

function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignupPage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const { login } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

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
        notify(t("signup.success"), "success");
        router.push("/login");
      }
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("signup.fail")), "error");
    }
  }

  return (
    <AuthPageBox title={t("signup.title")}>
      <div className="flex flex-col gap-4">
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
      </div>
    </AuthPageBox>
  );
}