"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";
import { FONT_OPTIONS, FONT_WEIGHT_OPTIONS } from "@/lib/fonts";

const API_URL = "http://localhost:3001";

type ButtonStyle = { name: string; bgColor: string; textColor: string };

export default function DesignSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const [footerBgColor, setFooterBgColor] = useState("#383838");
  const [footerTextColor, setFooterTextColor] = useState("#F9F6F0");
  const [sidebarBgColor, setSidebarBgColor] = useState("#383838");
  const [sidebarTextColor, setSidebarTextColor] = useState("#F9F6F0");
  const [fontFamily, setFontFamily] = useState("pretendard");
  const [fontWeight, setFontWeight] = useState("400");
  const [buttonStyles, setButtonStyles] = useState<ButtonStyle[]>([
    { name: "버튼1", bgColor: "#383838", textColor: "#F9F6F0" },
  ]);

  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setFooterBgColor(data.footerBgColor || "#383838");
        setFooterTextColor(data.footerTextColor || "#F9F6F0");
        setSidebarBgColor(data.sidebarBgColor || "#383838");
        setSidebarTextColor(data.sidebarTextColor || "#F9F6F0");
        setFontFamily(data.fontFamily || "pretendard");
        setFontWeight(data.fontWeight || "400");
        setButtonStyles(
          Array.isArray(data.buttonStyles) && data.buttonStyles.length > 0
            ? data.buttonStyles
            : [{ name: "버튼1", bgColor: "#383838", textColor: "#F9F6F0" }],
        );
      });
  }, []);

  function updateButtonStyle(index: number, field: "bgColor" | "textColor", value: string) {
    setButtonStyles((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addButtonStyle() {
    const nextNum = buttonStyles.length + 1;
    setButtonStyles((prev) => [...prev, { name: `버튼${nextNum}`, bgColor: "#383838", textColor: "#F9F6F0" }]);
  }

  function removeButtonStyle(index: number) {
    if (!window.confirm(t("design.deleteButtonConfirm"))) return;
    setButtonStyles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        footerBgColor, footerTextColor, sidebarBgColor, sidebarTextColor, buttonStyles, fontFamily, fontWeight,
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
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold">{t("design.fontSection")}</p>
          <div className="flex flex-col gap-2">
            <Label>{t("design.fontLabel")}</Label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Label>{t("design.fontWeightLabel")}</Label>
            <select
              value={fontWeight}
              onChange={(e) => setFontWeight(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              {FONT_WEIGHT_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">{t("design.footerSection")}</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("design.footerBgColor")}</Label>
              <Input type="color" value={footerBgColor} onChange={(e) => setFooterBgColor(e.target.value)} className="h-10 w-20 p-1" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("design.footerTextColor")}</Label>
              <Input type="color" value={footerTextColor} onChange={(e) => setFooterTextColor(e.target.value)} className="h-10 w-20 p-1" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">{t("design.sidebarSection")}</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("design.sidebarBgColor")}</Label>
              <Input type="color" value={sidebarBgColor} onChange={(e) => setSidebarBgColor(e.target.value)} className="h-10 w-20 p-1" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("design.sidebarTextColor")}</Label>
              <Input type="color" value={sidebarTextColor} onChange={(e) => setSidebarTextColor(e.target.value)} className="h-10 w-20 p-1" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">{t("design.buttonSection")}</p>
          <div className="flex flex-col gap-3">
            {buttonStyles.map((b, i) => (
              <div key={b.name} className="rounded-lg border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {b.name}
                    {b.name === "버튼1" && (
                      <span className="ml-2 text-xs text-neutral-400">{t("design.button1Note")}</span>
                    )}
                  </p>
                  {b.name !== "버튼1" && (
                    <button
                      type="button"
                      onClick={() => removeButtonStyle(i)}
                      className="cursor-pointer rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      {t("design.deleteButtonStyle")}
                    </button>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{t("design.buttonBgColor")}</Label>
                    <Input
                      type="color"
                      value={b.bgColor}
                      onChange={(e) => updateButtonStyle(i, "bgColor", e.target.value)}
                      className="h-10 w-20 p-1"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{t("design.buttonTextColor")}</Label>
                    <Input
                      type="color"
                      value={b.textColor}
                      onChange={(e) => updateButtonStyle(i, "textColor", e.target.value)}
                      className="h-10 w-20 p-1"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addButtonStyle}
              className="cursor-pointer self-start rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              {t("design.addButtonStyle")}
            </button>
          </div>
        </div>

        <Button className="cursor-pointer" onClick={handleSave}>
          {t("admin.settings.save")}
        </Button>
      </div>
    </div>
  );
}