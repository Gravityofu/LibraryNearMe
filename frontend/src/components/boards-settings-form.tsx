"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Board = {
  id: number;
  code: string;
  name: string;
  listStyle: "LIST" | "THUMBNAIL";
  allowMemberWrite: boolean;
  allowGuestWrite: boolean;
  allowGuestComment: boolean;
  isMaterialRequest: boolean;
};

// '예/아니오' 두 가지 중 하나를 고르는 카드형 선택지입니다. (다른 설정 화면들과 같은 방식입니다.)
function ChoiceCardGroup({
  name,
  value,
  onChange,
  disabled,
  yesLabel,
  noLabel,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <label
        className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${
          value
            ? "border-[#383838] bg-[#383838] text-[#F9F6F0]"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        <input
          type="radio"
          name={name}
          checked={value}
          disabled={disabled}
          onChange={() => onChange(true)}
          className="sr-only"
        />
        {yesLabel}
      </label>
      <label
        className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${
          !value
            ? "border-[#383838] bg-[#383838] text-[#F9F6F0]"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        <input
          type="radio"
          name={name}
          checked={!value}
          disabled={disabled}
          onChange={() => onChange(false)}
          className="sr-only"
        />
        {noLabel}
      </label>
    </div>
  );
}

export default function BoardsSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [boards, setBoards] = useState<Board[]>([]);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [allowGuestWriteValue, setAllowGuestWriteValue] = useState(false);
  const [allowGuestCommentValue, setAllowGuestCommentValue] = useState(false);

  async function loadBoards() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setBoards(await res.json());
    } else {
      notify("❌ " + t("settings.boards.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditModal(board: Board) {
    setEditingBoard(board);
    setAllowGuestWriteValue(board.allowGuestWrite);
    setAllowGuestCommentValue(board.allowGuestComment);
  }

  async function handleSave() {
    if (!editingBoard) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(`${API_URL}/boards/${editingBoard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        allowGuestWrite: allowGuestWriteValue,
        allowGuestComment: allowGuestCommentValue,
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.boards.saveSuccess"), "success");
      setEditingBoard(null);
      await loadBoards();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.boards.saveFail")), "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">{t("settings.boards.col.name")}</th>
              <th className="px-4 py-2.5">{t("settings.boards.col.listStyle")}</th>
              <th className="px-4 py-2.5">{t("settings.boards.col.allowMemberWrite")}</th>
              <th className="px-4 py-2.5">{t("settings.boards.col.allowGuestWrite")}</th>
              <th className="px-4 py-2.5">{t("settings.boards.col.allowGuestComment")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {boards.map((board) => (
              <tr
                key={board.id}
                onClick={() => openEditModal(board)}
                className="cursor-pointer hover:bg-neutral-50"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-medium">{board.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {board.listStyle === "LIST"
                    ? t("settings.boards.listStyleList")
                    : t("settings.boards.listStyleThumbnail")}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {board.allowMemberWrite ? t("settings.boards.yes") : t("settings.boards.no")}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {board.allowMemberWrite
                    ? board.allowGuestWrite
                      ? t("settings.boards.yes")
                      : t("settings.boards.no")
                    : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {board.allowGuestComment ? t("settings.boards.yes") : t("settings.boards.no")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingBoard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditingBoard(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm font-semibold">{editingBoard.name}</p>

            <div className="flex flex-col gap-4">
              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.allowGuestWrite")}
                </span>
                <ChoiceCardGroup
                  name="allowGuestWrite"
                  value={allowGuestWriteValue}
                  onChange={setAllowGuestWriteValue}
                  disabled={!editingBoard.allowMemberWrite}
                  yesLabel={t("settings.boards.yes")}
                  noLabel={t("settings.boards.no")}
                />
                {!editingBoard.allowMemberWrite && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("settings.boards.field.allowGuestWriteHint")}
                  </p>
                )}
              </div>

              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.allowGuestComment")}
                </span>
                <ChoiceCardGroup
                  name="allowGuestComment"
                  value={allowGuestCommentValue}
                  onChange={setAllowGuestCommentValue}
                  yesLabel={t("settings.boards.yes")}
                  noLabel={t("settings.boards.no")}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("settings.boards.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}