// 맨 윗줄의 "use client"는 "이 화면은 손님의 브라우저에서 움직인다"는 표시입니다.
// 입력창에 타이핑하고 버튼을 누르는 것처럼, 사용자와 상호작용하는 화면에 붙입니다.

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = "http://localhost:3001";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [status, setStatus] = useState("");

  // 페이지가 열릴 때 현재 설정을 불러옵니다. (5단계와 동일)
  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setPrimaryColor(data.primaryColor);
        }
      });
  }, []);

  // 저장 버튼을 눌렀을 때. (5단계와 동일)
  async function handleSave() {
    setStatus("저장 중...");
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, primaryColor }),
    });
    setStatus(
      res.ok
        ? "✅ 저장되었습니다! 홈페이지에서 확인해 보세요."
        : "❌ 저장에 실패했습니다."
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>도서관 설정 (관리자)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">도서관 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="color">대표 색상</Label>
            <Input
              id="color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>

          <Button onClick={handleSave}>저장하기</Button>

          <p className="text-sm text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </main>
  );
}