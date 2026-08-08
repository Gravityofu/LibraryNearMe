"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type NotificationTemplate = {
  id: number;
  status: string;
  message: string;
};

export default function NotificationSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/notification-templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: NotificationTemplate[] = await res.json();
      setTemplates(data);
      const next: Record<number, string> = {};
      data.forEach((tpl) => {
        next[tpl.id] = tpl.message;
      });
      setMessages(next);
    } else {
      notify("❌ " + t("settings.notifications.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function statusLabel(status: string) {
    if (status === "PURCHASING") return t("settings.notifications.status.PURCHASING");
    if (status === "PURCHASED") return t("settings.notifications.status.PURCHASED");
    if (status === "NOT_PURCHASED") return t("settings.notifications.status.NOT_PURCHASED");
    return status;
  }

  async function handleSaveAll() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const hasEmpty = templates.some((tpl) => !messages[tpl.id]?.trim());
    if (hasEmpty) {
      notify("❌ " + t("settings.notifications.messageRequired"), "error");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        templates.map((tpl) =>
          fetch(`${API_URL}/notification-templates/${tpl.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message: messages[tpl.id].trim() }),
          }),
        ),
      );
      if (results.every((res) => res.ok)) {
        notify("✅ " + t("settings.notifications.saveSuccess"), "success");
        await loadTemplates();
      } else {
        notify("❌ " + t("settings.notifications.saveFail"), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold">{t("settings.notifications.title")}</p>
        <p className="mb-4 text-xs text-neutral-400">{t("settings.notifications.desc")}</p>

        <div className="flex flex-col gap-4">
          {templates.map((tpl) => (
            <label key={tpl.id} className="block">
              <span className="mb-1 block text-sm text-neutral-500">{statusLabel(tpl.status)}</span>
              <input
                value={messages[tpl.id] ?? ""}
                onChange={(e) => setMessages({ ...messages, [tpl.id]: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="mt-5 cursor-pointer rounded-lg bg-[#383838] px-4 py-2.5 text-sm font-semibold text-[#F9F6F0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("settings.notifications.save")}
        </button>
      </div>
    </div>
  );
}