"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";

const API_URL = "http://localhost:3001";

export default function LoginPage() {
  const { t } = useI18n();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin() {
    setStatus(t("login.loading"));
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.user.name);
      setStatus(t("login.welcome").replace("{name}", data.user.name));
    } else {
      const data = await res.json().catch(() => null);
      setStatus("❌ " + (data?.message || t("login.fail")));
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loginId">{t("login.id")}</Label>
            <Input id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="cursor-pointer" onClick={handleLogin}>
            {t("login.submit")}
          </Button>
          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}