"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MemberType = { id: number; name: string; order: number };

export default function MemberTypesSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [items, setItems] = useState<MemberType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameText, setNameText] = useState("");

  async function loadItems() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/member-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems(await res.json());
    } else {
      notify("❌ " + t("settings.memberTypes.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setEditingId(null);
    setNameText("");
    setShowModal(true);
  }

  function openEditModal(item: MemberType) {
    setEditingId(item.id);
    setNameText(item.name);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const name = nameText.trim();
    if (!name) {
      notify("❌ " + t("settings.memberTypes.nameRequired"), "error");
      return;
    }
    const url = editingId ? `${API_URL}/member-types/${editingId}` : `${API_URL}/member-types`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.memberTypes.saveSuccess"), "success");
      closeModal();
      await loadItems();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.memberTypes.saveFail")), "error");
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm(t("settings.memberTypes.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/member-types/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.memberTypes.deleteSuccess"), "success");
      closeModal();
      await loadItems();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.memberTypes.deleteFail")), "error");
    }
  }

  return (
    <div className="mt-8">
      <p className="mb-2 text-sm font-semibold">{t("settings.memberTypes.title")}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openEditModal(item)}
            className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            {item.name}
          </button>
        ))}
        <button
          type="button"
          onClick={openAddModal}
          className="cursor-pointer rounded-full border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
        >
          {t("settings.memberTypes.addBtn")}
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingId ? t("settings.memberTypes.modal.editTitle") : t("settings.memberTypes.modal.addTitle")}
              </p>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.memberTypes.field.name")} *</span>
                <input
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>

              <ThemedButton preset="버튼1" onClick={handleSave} className="mt-5 w-full">
                {t("settings.memberTypes.save")}
              </ThemedButton>

              {editingId && (
                <button
                  onClick={handleDelete}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("settings.memberTypes.deleteBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}