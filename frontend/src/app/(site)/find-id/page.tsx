"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

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

export default function FindIdPage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<string[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      notify("❌ " + t("findId.requiredFields"), "error");
      return;
    }
    if (!isValidPhone(phone)) {
      notify("❌ " + t("findId.invalidPhone"), "error");
      return;
    }

    const res = await fetch(`${API_URL}/users/find-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data.loginIds || []);
    } else {
      notify("❌ " + t("findId.fail"), "error");
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("findId.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {result === null ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{t("findId.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">{t("findId.phone")}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="000-0000-0000"
                  inputMode="numeric"
                  maxLength={13}
                />
              </div>
              <Button type="submit" className="cursor-pointer">
                {t("findId.submit")}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {result.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-neutral-500">{t("findId.resultFound")}</p>
                  {result.map((id, i) => (
                    <p key={i} className="text-lg font-semibold">
                      {id}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">{t("findId.resultNotFound")}</p>
              )}
              <Link href="/login" className="text-center text-sm text-neutral-500 hover:text-neutral-800">
                {t("findId.backToLogin")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}