"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = "http://localhost:3001";

export default function LibrarySettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoUrl, setLogoUrl] = useState("");
  const [footerVersion, setFooterVersion] = useState("1.0.0");
  const [footerCopyright, setFooterCopyright] = useState("ⓒ 2026 Gravityofu");

  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setName(data.name);
          setPrimaryColor(data.primaryColor);
          setLogoUrl(data.logoUrl || "");
          setFooterVersion(data.footerVersion || "1.0.0");
          setFooterCopyright(data.footerCopyright || "ⓒ 2026 Gravityofu");
        }
      });
  }, []);

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name,
        primaryColor,
        logoUrl,
        footerVersion,
        footerCopyright,
      }),
    });
    if (res.ok) {
      notify(t("admin.settings.saved"), "success");
      setTimeout(() => window.location.reload(), 600);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("admin.settings.saveFail")), "error");
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("admin.settings.name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="color">{t("admin.settings.color")}</Label>
          <Input id="color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20 p-1" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="logoUrl">{t("admin.settings.logoUrl")}</Label>
          <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="footerVersion">{t("admin.settings.footerVersion")}</Label>
          <Input id="footerVersion" value={footerVersion} onChange={(e) => setFooterVersion(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="footerCopyright">{t("admin.settings.footerCopyright")}</Label>
          <Input id="footerCopyright" value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} />
        </div>
        <Button className="cursor-pointer" onClick={handleSave}>
          {t("admin.settings.save")}
        </Button>
      </div>
    </div>
  );
}