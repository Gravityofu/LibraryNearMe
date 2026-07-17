"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = "http://localhost:3001";

export default function SignupPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleSignup() {
    setStatus("가입 중...");
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password, name, phone, email }),
    });
    if (res.ok) {
      setStatus("✅ 회원가입이 완료되었습니다!");
    } else {
      const data = await res.json().catch(() => null);
      setStatus("❌ " + (data?.message || "가입에 실패했습니다."));
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loginId">아이디</Label>
            <Input id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">휴대폰 번호</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">이메일 (선택)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={handleSignup}>가입하기</Button>
          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}