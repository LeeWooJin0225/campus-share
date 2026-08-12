"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  nickname: string;
  email: string | null;
  created_at: string;
  is_deleted: boolean;
  role: "user" | "admin";
  account_status: "active" | "suspended" | "banned";
  suspended_until: string | null;
  post_count: number;
  comment_count: number;
};

type ApiResponse = {
  users: AdminUser[];
};

type UserAction = "suspend7" | "suspend30" | "unsuspend" | "ban";

type ActionModalState = {
  user: AdminUser;
  action: UserAction;
} | null;

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "banned" | "deleted">("all");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [actionReason, setActionReason] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  async function getSessionToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin/login");
      return null;
    }

    return session.access_token;
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const body = await response.json();

      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(body.error ?? "회원 목록을 불러오지 못했습니다.");
      }

      setUsers((body as ApiResponse).users ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        !q ||
        user.nickname.toLowerCase().includes(q) ||
        (user.email ?? "").toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "deleted" && user.is_deleted) ||
        (!user.is_deleted && filter === user.account_status);

      return matchesKeyword && matchesFilter;
    });
  }, [users, keyword, filter]);

  const actionLabels: Record<UserAction, string> = {
    suspend7: "7일 이용 정지",
    suspend30: "30일 이용 정지",
    unsuspend: "이용 정지 해제",
    ban: "영구 이용 정지",
  };

  function showToast(
    message: string,
    type: "success" | "error",
  ) {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function openActionModal(
    user: AdminUser,
    action: UserAction,
  ) {
    setActionReason("");
    setActionModal({ user, action });
  }

  function closeActionModal() {
    if (workingId) return;

    setActionModal(null);
    setActionReason("");
  }

  async function changeStatus() {
    if (!actionModal || workingId) return;

    const { user, action } = actionModal;

    try {
      setWorkingId(user.id);

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason:
            action === "unsuspend"
              ? "관리자 이용 정지 해제"
              : actionReason.trim() || "운영 정책에 따른 조치",
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ?? "회원 상태를 변경하지 못했습니다.",
        );
      }

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id
            ? {
                ...item,
                account_status: body.user.account_status,
                suspended_until: body.user.suspended_until,
              }
            : item,
        ),
      );

      setActionModal(null);
      setActionReason("");

      showToast(
        action === "unsuspend"
          ? `${user.nickname} 회원의 이용 정지를 해제했습니다.`
          : `${user.nickname} 회원을 ${actionLabels[action]} 처리했습니다.`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "회원 상태를 변경하지 못했습니다.",
        "error",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
  <>
    <main style={{ minHeight: "100vh", background: "var(--cs-bg)", padding: "24px 32px 60px", color: "var(--cs-ink)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <button type="button" onClick={() => router.push("/admin")} style={{ border: 0, background: "transparent", padding: 0, color: "var(--cs-ink-faint)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            ← 대시보드
          </button>
          <h1 style={{ margin: "10px 0 7px", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--cs-ink)" }}>회원 관리</h1>
          <p style={{ margin: 0, color: "var(--cs-ink-faint)", fontSize: 12.5 }}>
            회원 상태와 활동량을 확인하고 이용 정지 또는 영구 정지 조치를 할 수 있어요.
          </p>
        </div>

        <button type="button" onClick={() => void loadUsers()} style={{ border: "1px solid var(--cs-border-str)", borderRadius: "var(--cs-radius-md)", background: "var(--cs-surface)", color: "var(--cs-ink-soft)", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>
          새로고침
        </button>
      </div>

      <section style={{ marginTop: 20, background: "var(--cs-surface)", border: "1px solid var(--cs-border)", borderRadius: "var(--cs-radius-xl)", overflow: "hidden" }}>
        <div style={{ padding: 14, display: "flex", gap: 9, flexWrap: "wrap", borderBottom: "1px solid var(--cs-border)" }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="닉네임 또는 이메일 검색"
            style={{ flex: "1 1 260px", height: 34, border: "1px solid var(--cs-border-str)", borderRadius: "var(--cs-radius-lg)", padding: "0 11px", background: "var(--cs-surface)", color: "var(--cs-ink)", outline: "none", font: "inherit", fontSize: 12.5 }}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            style={{ height: 34, border: "1px solid var(--cs-border-str)", borderRadius: "var(--cs-radius-lg)", padding: "0 10px", background: "var(--cs-surface)", color: "var(--cs-ink)", font: "inherit", fontSize: 12.5 }}
          >
            <option value="all">전체 회원</option>
            <option value="active">정상</option>
            <option value="suspended">이용 정지</option>
            <option value="banned">영구 정지</option>
            <option value="deleted">탈퇴 회원</option>
          </select>
        </div>

        {errorMessage && <div style={{ margin: 14, padding: 11, borderRadius: "var(--cs-radius-md)", background: "var(--cs-exam-bg)", color: "var(--cs-error)", fontSize: 12 }}>{errorMessage}</div>}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--cs-ink-faint)", fontSize: 13.5 }}>불러오는 중이에요</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--cs-ink-faint)", fontSize: 13.5 }}>조건에 맞는 회원이 없어요</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "var(--cs-card-bg)", color: "var(--cs-ink-faint)", textAlign: "left" }}>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>회원</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>가입일</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>게시글</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>댓글</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>상태</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>정지 종료</th>
                  <th style={{ borderTop: "1px solid var(--cs-border)" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const statusLabel = user.is_deleted
                    ? "탈퇴"
                    : user.account_status === "suspended"
                      ? "이용 정지"
                      : user.account_status === "banned"
                        ? "영구 정지"
                        : user.role === "admin"
                          ? "관리자"
                          : "정상";

                  return (
                    <tr key={user.id} style={{ borderTop: "1px solid #f0eef3" }}>
                      <td style={{ padding: "12px", minWidth: 220 }}>
                        <div style={{ fontWeight: 500, color: "var(--cs-ink)" }}>{user.nickname}</div>
                        <div style={{ marginTop: 4, color: "var(--cs-ink-faint)", fontSize: 11 }}>{user.email ?? "이메일 없음"}</div>
                      </td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{formatDate(user.created_at)}</td>
                      <td style={{ padding: "12px" }}>{user.post_count}</td>
                      <td style={{ padding: "12px" }}>{user.comment_count}</td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", borderRadius: "var(--cs-radius-tag)", padding: "3px 8px", fontSize: 11, background: user.is_deleted ? "var(--cs-sunk)" : user.account_status === "banned" ? "var(--cs-exam-bg)" : user.account_status === "suspended" ? "var(--cs-trail-bg)" : user.role === "admin" ? "var(--cs-purple-bg)" : "var(--cs-ref-bg)", color: user.is_deleted ? "var(--cs-ink-soft)" : user.account_status === "banned" ? "var(--cs-exam-fg)" : user.account_status === "suspended" ? "var(--cs-trail-fg)" : user.role === "admin" ? "var(--cs-purple-dark)" : "var(--cs-ref-fg)" }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{formatDate(user.suspended_until)}</td>
                      <td style={{ padding: "12px", minWidth: 250 }}>
                        {user.role === "admin" || user.is_deleted ? (
                          <span style={{ color: "var(--cs-ink-faint)", fontSize: 11.5 }}>조치 불가</span>
                        ) : (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {user.account_status === "suspended" || user.account_status === "banned" ? (
                              <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "unsuspend")} style={{ border: "1px solid var(--cs-border)", borderRadius: "var(--cs-radius-sm)", background: "var(--cs-surface)", color: "var(--cs-ref-fg)", padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                                정지 해제
                              </button>
                            ) : (
                              <>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "suspend7")} style={{ border: "1px solid var(--cs-border)", borderRadius: "var(--cs-radius-sm)", background: "var(--cs-surface)", color: "var(--cs-trail-fg)", padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                                  7일 정지
                                </button>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "suspend30")} style={{ border: "1px solid var(--cs-border)", borderRadius: "var(--cs-radius-sm)", background: "var(--cs-surface)", color: "var(--cs-trail-fg)", padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                                  30일 정지
                                </button>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "ban")} style={{ border: "1px solid var(--cs-border)", borderRadius: "var(--cs-radius-sm)", background: "var(--cs-surface)", color: "var(--cs-exam-fg)", padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                                  영구 정지
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>

    {actionModal && (
      <div
        role="presentation"
        onClick={closeActionModal}
        style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 24, background: "rgba(24, 24, 27, 0.4)" }}
      >
       <div
  role="dialog"
  aria-modal="true"
  onClick={(event) => event.stopPropagation()}
  style={{
    width: "100%",
    maxWidth: 430,
    padding: "22px 22px 18px",
    boxSizing: "border-box",
    border: "1px solid var(--cs-border)",
    borderRadius: "var(--cs-radius-2xl)",
    background: "var(--cs-surface)",
    boxShadow: "var(--cs-shadow-dropdown)",
  }}
>
  {actionModal.action === "unsuspend" ? "✓" : "!"}

  <h2
    style={{
      margin: "0 0 8px",
      color: "var(--cs-ink)",
      fontSize: 17,
      fontWeight: 600,
      letterSpacing: "-0.02em",
    }}
  >
    {actionModal.action === "unsuspend"
      ? "이용 정지를 해제하시겠어요?"
      : `${actionLabels[actionModal.action]} 처리하시겠어요?`}
  </h2>

          <p
            style={{
              margin: 0,
              color: "#89828f",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {actionModal.action === "suspend7"
              ? "해당 회원은 7일 동안 CampusShare를 이용할 수 없습니다."
              : actionModal.action === "suspend30"
                ? "해당 회원은 30일 동안 CampusShare를 이용할 수 없습니다."
                : actionModal.action === "ban"
                  ? "해당 회원은 별도 해제 전까지 CampusShare를 이용할 수 없습니다."
                  : "해제 즉시 해당 회원이 다시 CampusShare를 이용할 수 있습니다."}
          </p>

          <div
            style={{
              marginTop: 17,
              padding: "11px 12px",
              borderRadius: 9,
              background: "#faf9fc",
              border: "1px solid #efedf3",
            }}
          >
            <div
              style={{ marginTop: 16, padding: "11px 12px", borderRadius: "var(--cs-radius-md)", background: "var(--cs-card-bg)", border: "1px solid var(--cs-border)" }}
            >
              대상 회원
            </div>

            <div
              style={{
                marginTop: 4,
  color: "var(--cs-ink)",
  fontSize: 12.5,
  fontWeight: 500,
              }}
            >
              {actionModal.user.nickname}
              {actionModal.user.email
                ? ` · ${actionModal.user.email}`
                : ""}
            </div>
          </div>

          {actionModal.action !== "unsuspend" && (
            <label
              style={{
                display: "grid",
                gap: 7,
                marginTop: 17,
              }}
            >
              <span
                style={{
                  color: "var(--cs-ink)", fontSize: 12.5, fontWeight: 500
                }}
              >
                조치 사유
              </span>

              <textarea
                value={actionReason}
                onChange={(event) =>
                  setActionReason(event.target.value)
                }
                placeholder="조치 사유를 입력해 주세요."
                rows={3}
                style={{ width: "100%", minHeight: 80, boxSizing: "border-box", resize: "vertical", border: "1px solid var(--cs-border-str)", borderRadius: "var(--cs-radius-lg)", padding: "10px 11px", background: "var(--cs-surface)", outline: "none", color: "var(--cs-ink)", font: "inherit", fontSize: 12.5, lineHeight: 1.6 }}
              />
            </label>
          )}

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={closeActionModal}
              style={{ height: 36, padding: "0 14px", border: "1px solid var(--cs-border-str)", borderRadius: "var(--cs-radius-lg)", background: "var(--cs-surface)", color: "var(--cs-ink-soft)", font: "inherit", fontSize: 12.5, cursor: workingId ? "default" : "pointer", opacity: workingId ? 0.65 : 1 }}
            >
              취소
            </button>

            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => void changeStatus()}
              style={{ height: 36, padding: "0 15px", border: 0, borderRadius: "var(--cs-radius-lg)", background: workingId ? "var(--cs-border-str)" : actionModal.action === "unsuspend" ? "var(--cs-ref-fg)" : actionModal.action === "ban" ? "var(--cs-exam-fg)" : "var(--cs-trail-fg)", color: "var(--cs-surface)", font: "inherit", fontSize: 12.5, fontWeight: 500, cursor: workingId ? "default" : "pointer" }}
            >
              {workingId
                ? "처리 중..."
                : actionModal.action === "unsuspend"
                  ? "정지 해제"
                  : actionLabels[actionModal.action]}
            </button>
          </div>
        </div>
      </div>
    )}

    {toast && (
      <div
        style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1100, minWidth: 230, maxWidth: 360, padding: "12px 14px", borderRadius: "var(--cs-radius-lg)", border: "1px solid var(--cs-border)", background: "var(--cs-surface)", color: toast.type === "success" ? "var(--cs-ref-fg)" : "var(--cs-error)", boxShadow: "var(--cs-shadow-dropdown)", fontSize: 12.5 }}
      >
        {toast.type === "success" ? "✓ " : "! "}
        {toast.message}
      </div>
    )}
  </>
  );
}
