"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SitePageHeader from "@/components/site-page-header";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { useNotify } from "@/components/notify-provider";
import { getBoardGroupKey } from "@/lib/site-nav";
import { formatKstDateTime } from "@/lib/date";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Post = {
  id: number;
  title: string;
  content: string;
  keywords: string[];
  viewCount: number;
  createdAt: string;
  authorName: string;
  board: {
    allowMemberComment: boolean;
    allowGuestComment: boolean;
  };
  materialRequest: {
    title: string;
    requestType: string;
    author: string | null;
    status: string;
  } | null;
};

type Comment = {
  id: number;
  content: string;
  guestName: string | null;
  authorUserId: number | null;
  createdAt: string;
  authorUser: { name: string } | null;
};

export default function PublicPostDetailPage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const { token, userId, isLoggedIn } = useAuth();
  const params = useParams<{ code: string; id: string }>();
  const { code, id } = params;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentGuestName, setCommentGuestName] = useState("");
  const [commentGuestPassword, setCommentGuestPassword] = useState("");

  // 지금 인라인으로 수정 중인 댓글 정보입니다.
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editGuestPassword, setEditGuestPassword] = useState("");

  async function loadPost() {
    setLoading(true);
    const res = await fetch(`${API_URL}/public/posts/${id}`);
    if (res.ok) {
      setPost(await res.json());
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  // 키워드 글자 색상으로 쓸, 설정 > 도서관 메뉴에서 지정한 도서관 대표 색상을 가져옵니다.
  async function loadPrimaryColor() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      setPrimaryColor(data?.primaryColor || null);
    }
  }

  async function loadComments() {
    const res = await fetch(`${API_URL}/public/comments?postId=${id}`);
    if (res.ok) {
      setComments(await res.json());
    }
  }

  useEffect(() => {
    loadPost();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadPrimaryColor();
  }, []);

  async function handleAddComment() {
    if (!commentContent.trim()) {
      return;
    }
    if (isLoggedIn) {
      if (!post?.board.allowMemberComment) {
        notify("❌ " + t("boards.public.comments.memberBlocked"), "error");
        return;
      }
    } else {
      if (!post?.board.allowGuestComment) {
        notify("❌ " + t("boards.public.comments.loginRequired"), "error");
        return;
      }
      if (!commentGuestName.trim()) {
        notify("❌ " + t("boards.public.write.guestNameRequired"), "error");
        return;
      }
      if (commentGuestPassword.length < 4) {
        notify("❌ " + t("boards.public.write.guestPasswordRequired"), "error");
        return;
      }
    }

    const body: any = { postId: id, content: commentContent };
    if (!isLoggedIn) {
      body.guestName = commentGuestName;
      body.guestPassword = commentGuestPassword;
    }

    const res = await fetch(`${API_URL}/public/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isLoggedIn ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setCommentContent("");
      setCommentGuestName("");
      setCommentGuestPassword("");
      loadComments();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.public.comments.saveFail")), "error");
    }
  }

  // 이 댓글을 지금 로그인한 나 또는 비회원이 수정/삭제해도 되는 댓글인지 (버튼을 보여줄지) 판단합니다.
  function canManageComment(c: Comment) {
    if (c.authorUserId) {
      return isLoggedIn && userId !== null && c.authorUserId === userId;
    }
    return true; // 비회원 댓글은 일단 버튼을 보여주고, 실제 수정/삭제 시 비밀번호로 확인합니다.
  }

  function startEditComment(c: Comment) {
    if (!c.authorUserId) {
      const pw = window.prompt(t("boards.public.comments.guestPasswordPrompt"));
      if (!pw) return;
      setEditGuestPassword(pw);
    } else {
      setEditGuestPassword("");
    }
    setEditingCommentId(c.id);
    setEditContent(c.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditContent("");
    setEditGuestPassword("");
  }

  async function submitEditComment(c: Comment) {
    if (!editContent.trim()) {
      notify("❌ " + t("boards.public.comments.contentRequired"), "error");
      return;
    }
    const body: any = { content: editContent };
    if (!c.authorUserId) {
      body.guestPassword = editGuestPassword;
    }
    const res = await fetch(`${API_URL}/public/comments/${c.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(c.authorUserId ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      cancelEditComment();
      loadComments();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.public.comments.editFail")), "error");
    }
  }

  async function handleDeleteComment(c: Comment) {
    let guestPassword = "";
    if (!c.authorUserId) {
      const pw = window.prompt(t("boards.public.comments.guestPasswordPrompt"));
      if (!pw) return;
      guestPassword = pw;
    }
    if (!window.confirm(t("boards.public.comments.deleteConfirm"))) return;

    const res = await fetch(`${API_URL}/public/comments/${c.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(c.authorUserId ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(c.authorUserId ? {} : { guestPassword }),
    });
    if (res.ok) {
      if (editingCommentId === c.id) cancelEditComment();
      loadComments();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.public.comments.deleteFail")), "error");
    }
  }

  // 제목과 같은 줄, 오른쪽 끝에 보여줄 "목록으로" 버튼입니다.
  const backButton = (
    <Link
      href={`/boards/${code}`}
      className="shrink-0 rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
    >
      ← {t("boards.detail.back")}
    </Link>
  );

  if (loading) {
    return <main className="py-10 text-center text-sm text-neutral-400">...</main>;
  }

  if (notFound || !post) {
    return (
      <main>
        <SitePageHeader
          crumbs={[t("nav.home"), t(getBoardGroupKey(code))]}
          title={t(`boards.tabs.${code}`)}
          action={backButton}
        />
        <p className="py-10 text-center text-sm text-neutral-400">{t("boards.write.loadFail")}</p>
      </main>
    );
  }

  return (
    <main>
      <SitePageHeader
        crumbs={[t("nav.home"), t(getBoardGroupKey(code)), t(`boards.tabs.${code}`)]}
        title={post.title}
        action={backButton}
      />

      {post.materialRequest && (
        <div className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
          <div>
            <span className="text-neutral-400">{t("boards.write.field.materialTitle")}: </span>
            {post.materialRequest.title}
          </div>
          <div>
            <span className="text-neutral-400">{t("boards.write.field.requestType")}: </span>
            {post.materialRequest.requestType}
          </div>
          {post.materialRequest.author && (
            <div>
              <span className="text-neutral-400">{t("boards.write.field.requestAuthor")}: </span>
              {post.materialRequest.author}
            </div>
          )}
          <div>
            <span className="text-neutral-400">{t("boards.list.col.status")}: </span>
            {t(`boards.status.${post.materialRequest.status}`)}
          </div>
        </div>
      )}

      {/* 회색 정보 상자(글쓴이·작성일·조회수 → 가로줄 → 키워드)와 흰색 본문 상자가 하나의 라운드 사각형으로 이어집니다. */}
      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <div className="bg-neutral-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
            <span>{post.authorName}</span>
            <span>{formatKstDateTime(post.createdAt)}</span>
            <span>
              {t("boards.list.col.viewCount")} {post.viewCount}
            </span>
          </div>

          <hr className="my-2 border-neutral-300" />

          {post.keywords && post.keywords.length > 0 && (
            <p className="text-xs" style={{ color: primaryColor || "#3b82f6" }}>
              {post.keywords.map((k) => `#${k}`).join(" ")}
            </p>
          )}
        </div>

        <div
          className="min-h-[120px] bg-white p-4 text-sm leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:p-2"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* 댓글 영역 */}
      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-neutral-700">
          {t("boards.write.comments.title")} ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("boards.write.comments.empty")}</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>
                    {c.authorUser?.name || c.guestName || t("boards.write.comments.guest")} ·{" "}
                    {formatKstDateTime(c.createdAt)}
                  </span>
                  {canManageComment(c) && editingCommentId !== c.id && (
                    <span className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditComment(c)}
                        className="cursor-pointer text-neutral-400 hover:text-neutral-700"
                      >
                        {t("boards.public.comments.editBtn")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c)}
                        className="cursor-pointer text-red-400 hover:text-red-600"
                      >
                        {t("boards.public.comments.deleteBtn")}
                      </button>
                    </span>
                  )}
                </div>

                {editingCommentId === c.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditComment}
                        className="cursor-pointer rounded border px-2 py-1 text-xs text-neutral-600"
                      >
                        {t("boards.public.comments.cancelBtn")}
                      </button>
                      <button
                        type="button"
                        onClick={() => submitEditComment(c)}
                        className="cursor-pointer rounded border border-neutral-300 bg-neutral-800 px-2 py-1 text-xs text-white"
                      >
                        {t("boards.public.comments.saveBtn")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-sm text-neutral-800">{c.content}</div>
                )}
              </li>
            ))}
          </ul>
        )}

        {(() => {
          const canComment = isLoggedIn ? post.board.allowMemberComment : post.board.allowGuestComment;
          return !canComment;
        })() ? (
          <p className="text-sm text-neutral-400">
            {isLoggedIn ? t("boards.public.comments.memberBlocked") : t("boards.public.comments.loginRequired")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {!isLoggedIn && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={commentGuestName}
                  onChange={(e) => setCommentGuestName(e.target.value)}
                  placeholder={t("boards.public.write.guestNameLabel")}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  value={commentGuestPassword}
                  onChange={(e) => setCommentGuestPassword(e.target.value)}
                  placeholder={t("boards.public.write.guestPasswordLabel")}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={t("boards.public.comments.placeholder")}
              rows={3}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <ThemedButton preset="버튼1" onClick={handleAddComment}>
                {t("boards.public.comments.submit")}
              </ThemedButton>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}