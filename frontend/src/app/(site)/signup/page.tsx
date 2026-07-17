"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";

const API_URL = "http://localhost:3001";

export default function SignupPage() {
  const { t } = useI18n();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleSignup() {
    setStatus(t("signup.loading"));
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password, name, phone, email }),
    });
    if (res.ok) {
      setStatus(t("signup.success"));
    } else {
      const data = await res.json().catch(() => null);
      setStatus("❌ " + (data?.message || t("signup.fail")));
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
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("signup.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="cursor-pointer" onClick={handleSignup}>
            {t("signup.submit")}
          </Button>
          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}