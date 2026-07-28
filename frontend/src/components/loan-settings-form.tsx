"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MemberLoanSetting = {
  memberTypeId: number;
  memberTypeName: string;
  maxLoanCount: number;
  maxReservationCount: number;
  maxSuspensionDays: number | null;
  reservationHoldDays: number;
};

type MaterialType = {
  id: number;
  nameKo: string;
  category: "PHYSICAL" | "DIGITAL";
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  maxReservationCount: number | null;
};

const EMPTY_MEMBER_FORM = {
  maxLoanCount: "",
  maxReservationCount: "",
  maxSuspensionDays: "",
  reservationHoldDays: "",
};

const EMPTY_MATERIAL_FORM = {
  maxLoanCount: "",
  loanPeriodDays: "",
  maxReservationCount: "",
};

export default function LoanSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [memberSettings, setMemberSettings] = useState<MemberLoanSetting[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberTypeId, setEditingMemberTypeId] = useState<number | null>(null);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL_FORM);

  async function loadMemberSettings() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMemberSettings(await res.json());
    } else {
      notify("❌ " + t("settings.loan.loadFail"), "error");
    }
  }

  async function loadMaterialTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMaterialTypes(await res.json());
    }
  }

  useEffect(() => {
    loadMemberSettings();
    loadMaterialTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openMemberModal(item: MemberLoanSetting) {
    setEditingMemberTypeId(item.memberTypeId);
    setMemberForm({
      maxLoanCount: String(item.maxLoanCount),
      maxReservationCount: String(item.maxReservationCount),
      maxSuspensionDays: item.maxSuspensionDays !== null ? String(item.maxSuspensionDays) : "",
      reservationHoldDays: String(item.reservationHoldDays),
    });
    setShowMemberModal(true);
  }

  function closeMemberModal() {
    setShowMemberModal(false);
    setEditingMemberTypeId(null);
  }

  async function handleSaveMember() {
    if (!editingMemberTypeId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types/${editingMemberTypeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: memberForm.maxLoanCount,
        maxReservationCount: memberForm.maxReservationCount,
        maxSuspensionDays: memberForm.maxSuspensionDays === "" ? null : memberForm.maxSuspensionDays,
        reservationHoldDays: memberForm.reservationHoldDays,
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMemberModal();
      await loadMemberSettings();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  function openMaterialModal(item: MaterialType) {
    setEditingMaterialId(item.id);
    setMaterialForm({
      maxLoanCount: item.maxLoanCount !== null ? String(item.maxLoanCount) : "",
      loanPeriodDays: item.loanPeriodDays !== null ? String(item.loanPeriodDays) : "",
      maxReservationCount: item.maxReservationCount !== null ? String(item.maxReservationCount) : "",
    });
    setShowMaterialModal(true);
  }

  function closeMaterialModal() {
    setShowMaterialModal(false);
    setEditingMaterialId(null);
  }

  async function handleSaveMaterial() {
    if (!editingMaterialId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (
      !materialForm.maxLoanCount.trim() ||
      !materialForm.loanPeriodDays.trim() ||
      !materialForm.maxReservationCount.trim()
    ) {
      notify("❌ " + t("settings.loan.materialFieldsRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/material-types/${editingMaterialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: Number(materialForm.maxLoanCount),
        loanPeriodDays: Number(materialForm.loanPeriodDays),
        maxReservationCount: Number(materialForm.maxReservationCount),
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMaterialModal();
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  const physicalTypes = materialTypes.filter((mt) => mt.category === "PHYSICAL");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionPhysical")}</p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.defaultTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.memberType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxReservationCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxSuspensionDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.reservationHoldDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {memberSettings.map((item) => (
                  <tr key={item.memberTypeId}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{item.memberTypeName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                      {item.maxSuspensionDays !== null ? item.maxSuspensionDays : t("settings.loan.noLimit")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.reservationHoldDays}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openMemberModal(item)}
                        className="cursor-pointer rounded border px-2 py-1 text-xs"
                      >
                        {t("settings.loan.editBtn")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.materialTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.materialType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.loanPeriodDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxReservationCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {physicalTypes.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{item.nameKo}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.loanPeriodDays ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openMaterialModal(item)}
                        className="cursor-pointer rounded border px-2 py-1 text-xs"
                      >
                        {t("settings.loan.editBtn")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionDigital")}</p>
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
          {t("settings.loan.digitalNotice")}
        </p>
      </div>

      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMemberModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.member.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxLoanCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxLoanCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxReservationCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxSuspensionDays")}</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxSuspensionDays}
                    onChange={(e) => setMemberForm({ ...memberForm, maxSuspensionDays: e.target.value })}
                    placeholder={t("settings.loan.maxSuspensionDaysPlaceholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-neutral-400">{t("settings.loan.maxSuspensionDaysHint")}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.reservationHoldDays")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.reservationHoldDays}
                    onChange={(e) => setMemberForm({ ...memberForm, reservationHoldDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMember} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMaterialModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.material.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxLoanCount")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.maxLoanCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.loanPeriodDays")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.loanPeriodDays}
                    onChange={(e) => setMaterialForm({ ...materialForm, loanPeriodDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={materialForm.maxReservationCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMaterial} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}