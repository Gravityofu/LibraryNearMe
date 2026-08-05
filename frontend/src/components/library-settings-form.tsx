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
  const [scanMode, setScanMode] = useState("SINGLE");
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState("");
  const [defaultMaterialCoverUrl, setDefaultMaterialCoverUrl] = useState("");

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
          setScanMode(data.scanMode || "SINGLE");
          setDefaultThumbnailUrl(data.defaultThumbnailUrl || "");
          setDefaultMaterialCoverUrl(data.defaultMaterialCoverUrl || "");
        }
      });
  }, []);

  // 사진 파일을 골라서 올리고, 성공하면 그 주소를 넘겨준 setter(입력창 상태)에 채워 넣습니다.
  async function uploadThumbnail(file: File, setter: (url: string) => void) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/uploads/board-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setter(data.url);
    } else {
      notify("❌ " + t("admin.settings.thumbnailUploadFail"), "error");
    }
  }

  function handleThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadThumbnail(file, setDefaultThumbnailUrl);
  }

  function handleMaterialCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadThumbnail(file, setDefaultMaterialCoverUrl);
  }

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
        scanMode,
        defaultThumbnailUrl,
        defaultMaterialCoverUrl,
      }),
    });
    if (res.ok) {
      notify(t("admin.settings.saved"), "success", () => window.location.reload());
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="scanMode">{t("admin.settings.scanMode.label")}</Label>
          <select
            id="scanMode"
            value={scanMode}
            onChange={(e) => setScanMode(e.target.value)}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="SINGLE">{t("admin.settings.scanMode.single")}</option>
            <option value="SDK">{t("admin.settings.scanMode.sdk")}</option>
          </select>
          <span className="text-xs text-neutral-400">{t("admin.settings.scanMode.hint")}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("admin.settings.defaultThumbnailUrl")}</Label>
          <span className="text-xs text-neutral-400">{t("admin.settings.defaultThumbnailHint")}</span>
          {defaultThumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={defaultThumbnailUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleThumbnailFileChange}
              className="text-xs"
            />
            {defaultThumbnailUrl && (
              <button
                type="button"
                onClick={() => setDefaultThumbnailUrl("")}
                className="cursor-pointer text-xs text-red-500 hover:underline"
              >
                {t("admin.settings.thumbnailRemove")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("admin.settings.defaultMaterialCoverUrl")}</Label>
          <span className="text-xs text-neutral-400">{t("admin.settings.defaultMaterialCoverHint")}</span>
          {defaultMaterialCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={defaultMaterialCoverUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleMaterialCoverFileChange}
              className="text-xs"
            />
            {defaultMaterialCoverUrl && (
              <button
                type="button"
                onClick={() => setDefaultMaterialCoverUrl("")}
                className="cursor-pointer text-xs text-red-500 hover:underline"
              >
                {t("admin.settings.thumbnailRemove")}
              </button>
            )}
          </div>
        </div>

        <Button className="cursor-pointer" onClick={handleSave}>
          {t("admin.settings.save")}
        </Button>
      </div>
    </div>
  );
}