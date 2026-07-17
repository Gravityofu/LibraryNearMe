"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = "http://localhost:3001";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 저장된 손목밴드(토큰)가 있는지 확인
    setToken(localStorage.getItem("token"));
    setChecked(true);

    // 현재 도서관 설정 불러오기 (가져오기는 로그인 없이 가능)
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setPrimaryColor(data.primaryColor);
        }
      });
  }, []);

  async function handleSave() {
    setStatus("저장 중...");
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // 손목밴드를 함께 보냄
      },
      body: JSON.stringify({ name, primaryColor }),
    });
    if (res.ok) {
      setStatus("✅ 저장되었습니다!");
    } else {
      const data = await res.json().catch(() => null);
      setStatus("❌ " + (data?.message || "저장에 실패했습니다."));
    }
  }

  if (!checked) return null; // 확인 전 잠깐 빈 화면

  // 로그인 안 했으면 로그인 안내 화면
  if (!token) {
    return (
      <main className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>관리자 페이지</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>관리자 로그인이 필요합니다.</p>
            <a href="/login">
              <Button>로그인하러 가기</Button>
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 로그인 했으면 설정 화면
  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>도서관 설정 (관리자)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">도서관 이름</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="color">대표 색상</Label>
            <Input id="color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <Button onClick={handleSave}>저장하기</Button>
          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}