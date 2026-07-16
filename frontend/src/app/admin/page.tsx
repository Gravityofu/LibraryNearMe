// 맨 윗줄의 "use client"는 "이 화면은 손님의 브라우저에서 움직인다"는 표시입니다.
// 입력창에 타이핑하고 버튼을 누르는 것처럼, 사용자와 상호작용하는 화면에 붙입니다.
"use client";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001";

export default function AdminPage() {
  // 입력창에 담길 값들을 기억하는 상자들입니다.
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [status, setStatus] = useState("");

  // 페이지가 처음 열릴 때, 현재 저장된 설정을 불러와 입력창을 채웁니다.
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

  // 저장 버튼을 눌렀을 때 실행됩니다.
  async function handleSave() {
    setStatus("저장 중...");
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH", // "일부 바꾸기" 요청
      headers: { "Content-Type": "application/json" }, // "JSON 형식으로 보낼게요"
      body: JSON.stringify({ name, primaryColor }), // 실제로 보내는 값
    });
    if (res.ok) {
      setStatus("✅ 저장되었습니다! 홈페이지를 새로고침해서 확인해 보세요.");
    } else {
      setStatus("❌ 저장에 실패했습니다.");
    }
  }

  return (
    <main
      style={{
        maxWidth: "480px",
        margin: "3rem auto",
        padding: "2rem",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
        도서관 설정 (관리자)
      </h1>

      <label>
        도서관 이름
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem",
            marginTop: "0.3rem",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />
      </label>

      <label>
        대표 색상
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          style={{
            display: "block",
            marginTop: "0.3rem",
            width: "60px",
            height: "40px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />
      </label>

      <button
        onClick={handleSave}
        style={{
          padding: "0.7rem",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        저장하기
      </button>

      <p style={{ color: "#555" }}>{status}</p>
    </main>
  );
}