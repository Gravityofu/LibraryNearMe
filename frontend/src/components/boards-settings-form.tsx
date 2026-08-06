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
  thumbnailRatio: "WIDE" | "TALL";
  allowMemberWrite: boolean;
  allowGuestWrite: boolean;
  allowMemberComment: boolean;
  allowGuestComment: boolean;
  defaultThumbnailUrl: string | null;
  isMaterialRequest: boolean;
};

type BoardFont = {
  id: number;
  name: string;
  fontFamilyName: string;
  googleFontUrl: string | null;
  isDeletable: boolean;
};

const EMPTY_FONT_FORM = { name: "", fontFamilyName: "", googleFontUrl: "" };

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
  const [listStyleValue, setListStyleValue] = useState<"LIST" | "THUMBNAIL">("LIST");
  const [thumbnailRatioValue, setThumbnailRatioValue] = useState<"WIDE" | "TALL">("WIDE");
  const [allowMemberWriteValue, setAllowMemberWriteValue] = useState(false);
  const [allowGuestWriteValue, setAllowGuestWriteValue] = useState(false);
  const [allowMemberCommentValue, setAllowMemberCommentValue] = useState(true);
  const [allowGuestCommentValue, setAllowGuestCommentValue] = useState(false);
  const [defaultThumbnailUrlValue, setDefaultThumbnailUrlValue] = useState("");

  // 게시판 글꼴 목록입니다.
  const [fonts, setFonts] = useState<BoardFont[]>([]);
  const [showFontModal, setShowFontModal] = useState(false);
  const [editingFontId, setEditingFontId] = useState<number | null>(null);
  const [fontForm, setFontForm] = useState(EMPTY_FONT_FORM);

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

  async function loadFonts() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/board-fonts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFonts(await res.json());
    } else {
      notify("❌ " + t("settings.boards.fonts.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadBoards();
    loadFonts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditModal(board: Board) {
    setEditingBoard(board);
    setListStyleValue(board.listStyle);
    setThumbnailRatioValue(board.thumbnailRatio === "TALL" ? "TALL" : "WIDE");
    setAllowMemberWriteValue(board.allowMemberWrite);
    setAllowGuestWriteValue(board.allowGuestWrite);
    setAllowMemberCommentValue(board.allowMemberComment);
    setAllowGuestCommentValue(board.allowGuestComment);
    setDefaultThumbnailUrlValue(board.defaultThumbnailUrl || "");
  }

  // '회원 글쓰기'를 끄면, 의미가 없어지는 '비회원 글쓰기'도 화면에서 함께 꺼줍니다.
  function handleAllowMemberWriteChange(v: boolean) {
    setAllowMemberWriteValue(v);
    if (!v) {
      setAllowGuestWriteValue(false);
    }
  }

  // 게시판 기본 썸네일 사진을 올리고, 성공하면 그 주소를 입력창 상태에 채워 넣습니다.
  async function handleBoardThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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
      setDefaultThumbnailUrlValue(data.url);
    } else {
      notify("❌ " + t("admin.settings.thumbnailUploadFail"), "error");
    }
  }

  async function handleSave() {
    if (!editingBoard) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(`${API_URL}/boards/${editingBoard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        listStyle: listStyleValue,
        thumbnailRatio: thumbnailRatioValue,
        allowMemberWrite: allowMemberWriteValue,
        allowGuestWrite: allowGuestWriteValue,
        allowMemberComment: allowMemberCommentValue,
        allowGuestComment: allowGuestCommentValue,
        defaultThumbnailUrl: defaultThumbnailUrlValue,
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

  function openAddFontModal() {
    setEditingFontId(null);
    setFontForm(EMPTY_FONT_FORM);
    setShowFontModal(true);
  }

  function openEditFontModal(font: BoardFont) {
    if (!font.isDeletable) return; // 기본 글꼴(Pretendard)은 수정 화면을 열지 않습니다.
    setEditingFontId(font.id);
    setFontForm({ name: font.name, fontFamilyName: font.fontFamilyName, googleFontUrl: font.googleFontUrl || "" });
    setShowFontModal(true);
  }

  async function handleSaveFont() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!fontForm.name.trim() || !fontForm.fontFamilyName.trim()) {
      notify("❌ " + t("settings.boards.fonts.nameRequired"), "error");
      return;
    }
    const url = editingFontId ? `${API_URL}/board-fonts/${editingFontId}` : `${API_URL}/board-fonts`;
    const res = await fetch(url, {
      method: editingFontId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: fontForm.name.trim(),
        fontFamilyName: fontForm.fontFamilyName.trim(),
        googleFontUrl: fontForm.googleFontUrl.trim() || null,
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.boards.fonts.saveSuccess"), "success");
      setShowFontModal(false);
      await loadFonts();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.boards.fonts.saveFail")), "error");
    }
  }

  async function handleDeleteFont(id: number) {
    if (!window.confirm(t("settings.boards.fonts.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/board-fonts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.boards.fonts.deleteSuccess"), "success");
      await loadFonts();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.boards.fonts.deleteFail")), "error");
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
              <th className="px-4 py-2.5">{t("settings.boards.col.allowMemberComment")}</th>
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
                  {board.allowMemberComment ? t("settings.boards.yes") : t("settings.boards.no")}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {board.allowGuestComment ? t("settings.boards.yes") : t("settings.boards.no")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold">{t("settings.boards.fonts.title")}</p>
        <p className="mb-3 text-xs text-neutral-400">{t("settings.boards.fonts.desc")}</p>

        <div className="flex flex-wrap gap-2">
          {fonts.map((font) => (
            <div
              key={font.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
            >
              <span>{font.name}</span>
              {!font.isDeletable && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  {t("settings.boards.fonts.defaultBadge")}
                </span>
              )}
              {font.isDeletable && (
                <>
                  <button
                    type="button"
                    onClick={() => openEditFontModal(font)}
                    className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800"
                  >
                    {t("settings.boards.fonts.editBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFont(font.id)}
                    className="cursor-pointer text-xs text-red-500 hover:text-red-700"
                  >
                    {t("settings.boards.fonts.deleteBtn")}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={openAddFontModal}
            className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm font-semibold text-[#F9F6F0]"
          >
            {t("settings.boards.fonts.addBtn")}
          </button>
        </div>
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
                  {t("settings.boards.field.listStyle")}
                </span>
                <ChoiceCardGroup
                  name="listStyle"
                  value={listStyleValue === "THUMBNAIL"}
                  onChange={(v) => setListStyleValue(v ? "THUMBNAIL" : "LIST")}
                  yesLabel={t("settings.boards.listStyleThumbnail")}
                  noLabel={t("settings.boards.listStyleList")}
                />
              </div>

              {listStyleValue === "THUMBNAIL" && (
                <div>
                  <span className="mb-1 block text-sm text-neutral-500">
                    {t("settings.boards.field.thumbnailRatio")}
                  </span>
                  <ChoiceCardGroup
                    name="thumbnailRatio"
                    value={thumbnailRatioValue === "TALL"}
                    onChange={(v) => setThumbnailRatioValue(v ? "TALL" : "WIDE")}
                    yesLabel={t("settings.boards.thumbnailRatioTall")}
                    noLabel={t("settings.boards.thumbnailRatioWide")}
                  />
                </div>
              )}

              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.allowMemberWrite")}
                </span>
                <ChoiceCardGroup
                  name="allowMemberWrite"
                  value={allowMemberWriteValue}
                  onChange={handleAllowMemberWriteChange}
                  yesLabel={t("settings.boards.yes")}
                  noLabel={t("settings.boards.no")}
                />
              </div>

              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.allowGuestWrite")}
                </span>
                <ChoiceCardGroup
                  name="allowGuestWrite"
                  value={allowGuestWriteValue}
                  onChange={setAllowGuestWriteValue}
                  disabled={!allowMemberWriteValue}
                  yesLabel={t("settings.boards.yes")}
                  noLabel={t("settings.boards.no")}
                />
                {!allowMemberWriteValue && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("settings.boards.field.allowGuestWriteHint")}
                  </p>
                )}
              </div>

              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.allowMemberComment")}
                </span>
                <ChoiceCardGroup
                  name="allowMemberComment"
                  value={allowMemberCommentValue}
                  onChange={setAllowMemberCommentValue}
                  yesLabel={t("settings.boards.yes")}
                  noLabel={t("settings.boards.no")}
                />
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

              <div>
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("settings.boards.field.defaultThumbnailUrl")}
                </span>
                <p className="mb-2 text-xs text-neutral-400">{t("settings.boards.field.defaultThumbnailUrlHint")}</p>
                {defaultThumbnailUrlValue && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={defaultThumbnailUrlValue} alt="" className="mb-2 h-16 w-16 rounded-lg object-cover" />
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleBoardThumbnailFileChange}
                    className="text-xs"
                  />
                  {defaultThumbnailUrlValue && (
                    <button
                      type="button"
                      onClick={() => setDefaultThumbnailUrlValue("")}
                      className="cursor-pointer text-xs text-red-500 hover:underline"
                    >
                      {t("admin.settings.thumbnailRemove")}
                    </button>
                  )}
                </div>
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

      {showFontModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowFontModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingFontId ? t("settings.boards.fonts.modal.editTitle") : t("settings.boards.fonts.modal.addTitle")}
              </p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">
                    {t("settings.boards.fonts.field.name")} *
                  </span>
                  <input
                    value={fontForm.name}
                    onChange={(e) => setFontForm({ ...fontForm, name: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">
                    {t("settings.boards.fonts.field.fontFamilyName")} *
                  </span>
                  <input
                    value={fontForm.fontFamilyName}
                    onChange={(e) => setFontForm({ ...fontForm, fontFamilyName: e.target.value })}
                    placeholder="예: Nanum Gothic"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("settings.boards.fonts.field.fontFamilyNameHint")}
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">
                    {t("settings.boards.fonts.field.googleFontUrl")}
                  </span>
                  <input
                    value={fontForm.googleFontUrl}
                    onChange={(e) => setFontForm({ ...fontForm, googleFontUrl: e.target.value })}
                    placeholder="https://fonts.googleapis.com/css2?family=..."
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("settings.boards.fonts.field.googleFontUrlHint")}
                  </p>
                </label>
              </div>

              <button
                onClick={handleSaveFont}
                className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
              >
                {t("settings.boards.fonts.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}