"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import LibrarySettingsForm from "@/components/library-settings-form";
import DesignSettingsForm from "@/components/design-settings-form";
import CopyOptionsSettingsForm from "@/components/copy-options-settings-form";
import MaterialTypesSettingsForm from "@/components/material-types-settings-form";
import MemberTypesSettingsForm from "@/components/member-types-settings-form";
import LoanSettingsForm from "@/components/loan-settings-form";
import BoardsSettingsForm from "@/components/boards-settings-form";
import NotificationSettingsForm from "@/components/notification-settings-form";

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

// 이 순서가 곧 탭이 화면에 나오는 순서입니다. 왼쪽 사이드바에서 '설정'을 누르면 맨 앞(library)이 기본으로 열립니다.
const SETTINGS_TABS = [
  "library",
  "design",
  "materialTypes",
  "copyOptions",
  "kormarcTags",
  "loan",
  "boards",
  "notifications",
];

function AdminSettingsPageInner() {
  const { notify } = useNotify();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tags, setTags] = useState<KormarcTag[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_TAG);

  // 지금 보고 있는 탭이 무엇인지 기억합니다. 처음 화면을 열 때는 주소 뒤의 ?tab= 값을 쓰고,
  // 없으면 맨 왼쪽 탭인 '도서관'을 기본으로 엽니다.
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab && SETTINGS_TABS.includes(initialTab) ? initialTab : "library",
  );

  function handleTabChange(value: string) {
    setActiveTab(value);
  }

  // 지금 보고 있는 탭을 주소 뒤에 반영합니다. (브레드크럼이 탭에 맞게 나오도록 하기 위함입니다.)
  useEffect(() => {
    router.replace(`/admin/settings?tab=${activeTab}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="gap-2">
          <TabsTrigger value="library">{t("settings.tabs.library")}</TabsTrigger>
          <TabsTrigger value="design">{t("settings.tabs.design")}</TabsTrigger>
          <TabsTrigger value="materialTypes">{t("settings.tabs.materialTypes")}</TabsTrigger>
          <TabsTrigger value="copyOptions">{t("settings.tabs.copyOptions")}</TabsTrigger>
          <TabsTrigger value="kormarcTags">{t("settings.tabs.kormarcTags")}</TabsTrigger>
          <TabsTrigger value="loan">{t("settings.tabs.loan")}</TabsTrigger>
          <TabsTrigger value="boards">{t("settings.tabs.boards")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.tabs.notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-4">
          <LibrarySettingsForm />
          <MemberTypesSettingsForm />
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <DesignSettingsForm />
        </TabsContent>

        <TabsContent value="materialTypes" className="mt-4">
          <MaterialTypesSettingsForm />
        </TabsContent>

        <TabsContent value="copyOptions" className="mt-4">
          <CopyOptionsSettingsForm />
        </TabsContent>

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

        <TabsContent value="loan" className="mt-4">
          <LoanSettingsForm />
        </TabsContent>

        <TabsContent value="boards" className="mt-4">
          <BoardsSettingsForm />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationSettingsForm />
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

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminSettingsPageInner />
    </Suspense>
  );
}