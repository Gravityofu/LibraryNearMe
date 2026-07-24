"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type KormarcTag = {
  id: number;
  tag: string;
  fieldName: string;
  indicators?: string;
  subfieldCodes?: string;
  example?: string;
};

const EMPTY_TAG = { tag: "", fieldName: "", indicators: "", subfieldCodes: "", example: "" };

export default function AdminSettingsPage() {
  const { notify } = useNotify();
  const { t } = useI18n();

  const [tags, setTags] = useState<KormarcTag[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_TAG);

  async function loadTags() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/settings/kormarc-tags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTags(await res.json());
    } else {
      notify("❌ " + t("settings.tags.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_TAG);
    setShowModal(true);
  }

  function openEditModal(tag: KormarcTag) {
    setEditingId(tag.id);
    setForm({
      tag: tag.tag,
      fieldName: tag.fieldName,
      indicators: tag.indicators || "",
      subfieldCodes: tag.subfieldCodes || "",
      example: tag.example || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.tag.trim()) {
      notify("❌ " + t("settings.tags.tagRequired"), "error");
      return;
    }
    const url = editingId
      ? `${API_URL}/settings/kormarc-tags/${editingId}`
      : `${API_URL}/settings/kormarc-tags`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      notify("✅ " + t("settings.tags.saveSuccess"), "success");
      setShowModal(false);
      await loadTags();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.tags.saveFail")), "error");
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm(t("settings.tags.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/settings/kormarc-tags/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.tags.deleteSuccess"), "success");
      setShowModal(false);
      await loadTags();
    } else {
      notify("❌ " + t("settings.tags.deleteFail"), "error");
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-bold">{t("settings.title")}</h1>

      <Tabs defaultValue="kormarcTags">
        <TabsList>
          <TabsTrigger value="kormarcTags">{t("settings.tabs.kormarcTags")}</TabsTrigger>
        </TabsList>

        <TabsContent value="kormarcTags" className="mt-4">
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.tags.col.tag")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.fieldName")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.indicators")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.subfieldCodes")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.example")}</th>
                  <th className="px-3 py-2">{t("settings.tags.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{tag.tag}</td>
                    <td className="whitespace-nowrap px-3 py-2">{tag.fieldName}</td>
                    <td className="px-3 py-2 text-neutral-500">{tag.indicators || "-"}</td>
                    <td className="px-3 py-2 text-neutral-500">{tag.subfieldCodes || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{tag.example || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(tag)}
                        className="cursor-pointer rounded border px-2 py-1 text-xs"
                      >
                        {t("settings.tags.editBtn")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={openAddModal}
              className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("settings.tags.addBtn")}
            </button>
          </div>
          
        </TabsContent>
      </Tabs>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold">
              {editingId ? t("settings.tags.modal.editTitle") : t("settings.tags.modal.addTitle")}
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.tags.field.tag")} *</span>
                <input
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.tags.field.fieldName")}</span>
                <input
                  value={form.fieldName}
                  onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.tags.field.indicators")}</span>
                <textarea
                  value={form.indicators}
                  onChange={(e) => setForm({ ...form, indicators: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.tags.field.subfieldCodes")}
                </span>
                <textarea
                  value={form.subfieldCodes}
                  onChange={(e) => setForm({ ...form, subfieldCodes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.tags.field.example")}</span>
                <input
                  value={form.example}
                  onChange={(e) => setForm({ ...form, example: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
            </div>


            <button
              onClick={handleSave}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("settings.tags.save")}
            </button>
            {editingId && (
              <button
                onClick={handleDelete}
                className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("settings.tags.deleteBtn")}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}