"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { useAuth } from "@/components/auth-provider";
import AuthPageBox from "@/components/auth-page-box";
import { BirthDateField, isValidBirthDate } from "@/components/birth-date-field";

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

// 카카오 우편번호 서비스 팝업을 엽니다. 주소를 고르면 onSelect로 그 값을 전달합니다.
function openAddressSearch(onSelect: (address: string) => void) {
  const daum = (window as any).daum;
  if (!daum || !daum.Postcode) {
    alert("주소 검색 창을 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
    return;
  }
  new daum.Postcode({
    oncomplete: function (data: any) {
      const address = data.roadAddress || data.jibunAddress || data.address;
      onSelect(address);
    },
  }).open();
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
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [addressMain, setAddressMain] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [memberNo, setMemberNo] = useState("");

  // 화면이 열리자마자 "다음 회원번호"를 물어봐서 미리 보여줍니다.
  useEffect(() => {
    fetch(`${API_URL}/users/next-member-no-public`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.memberNo) setMemberNo(data.memberNo);
      })
      .catch(() => {});
  }, []);

  async function handleSignup() {
    if (!isValidPhone(phone)) {
      notify("❌ " + t("signup.invalidPhone"), "error");
      return;
    }
    if (!isValidEmail(email)) {
      notify("❌ " + t("signup.invalidEmail"), "error");
      return;
    }

    // 생년월일: 세 칸 중 하나라도 입력했으면 셋 다 채워져 있어야 하고, 진짜 존재하는 날짜여야 합니다.
    const anyBirthFilled = birthYear || birthMonth || birthDay;
    const allBirthFilled = birthYear && birthMonth && birthDay;
    if (anyBirthFilled && !allBirthFilled) {
      notify("❌ " + t("signup.invalidBirthDate"), "error");
      return;
    }
    if (allBirthFilled && !isValidBirthDate(birthYear, birthMonth, birthDay)) {
      notify("❌ " + t("signup.invalidBirthDate"), "error");
      return;
    }
    const birthDateValue = allBirthFilled
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : undefined;

    const address = [addressMain, addressDetail].filter((v) => v.trim()).join(" ") || undefined;

    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password, name, phone, email, birthDate: birthDateValue, address, memberNo }),
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
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
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
          <Label>{t("signup.memberNo")}</Label>
          <input
            value={memberNo}
            disabled
            className="w-full rounded-lg border bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
          />
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

        <div className="flex flex-col gap-2">
          <Label>{t("signup.birthDate")}</Label>
          <BirthDateField
            value={{ year: birthYear, month: birthMonth, day: birthDay }}
            onChange={(next) => {
              setBirthYear(next.year);
              setBirthMonth(next.month);
              setBirthDay(next.day);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>{t("signup.address")}</Label>
            <button
              type="button"
              onClick={() =>
                openAddressSearch((addr) => {
                  setAddressMain(addr);
                  setAddressDetail("");
                })
              }
              className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              {t("signup.findAddressBtn")}
            </button>
          </div>
          {addressMain && (
            <div className="flex flex-col gap-2">
              <input
                value={addressMain}
                disabled
                className="w-full rounded-lg border bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
              />
              <Input
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder={t("signup.addressDetailPlaceholder")}
              />
            </div>
          )}
        </div>

        <Button className="cursor-pointer" onClick={handleSignup}>
          {t("signup.submit")}
        </Button>
      </div>
    </AuthPageBox>
  );
}