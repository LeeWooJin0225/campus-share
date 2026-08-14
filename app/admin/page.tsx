"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DashboardData = {
  admin: {
    nickname: string;
    email: string | null;
  };
  stats: {
    activeUsers: number;
    totalPosts: number;
    totalPurchases: number;
    todaySignups: number;
    pendingReports: number;
  };
  activity: {
    key: string;
    label: string;
    posts: number;
    comments: number;
    reports: number;
  }[];
  reportReasons: Record<string, number>;
  recentReports: {
    id: string;
    reporter_id: string;
    reporter_nickname: string;
    target_type: "post" | "comment";
    target_id: string;
    target_label: string;
    reason: string;
    status: "pending" | "resolved" | "rejected";
    created_at: string;
  }[];
  recentActions: {
    id: string;
    action_type: string;
    target_type: string | null;
    target_id: string | null;
    target_user_id: string | null;
    reason: string | null;
    created_at: string;
  }[];
};

const EMPTY_DATA: DashboardData = {
  admin: { nickname: "관리자", email: null },
  stats: {
    activeUsers: 0,
    totalPosts: 0,
    totalPurchases: 0,
    todaySignups: 0,
    pendingReports: 0,
  },
  activity: [],
  reportReasons: {},
  recentReports: [],
  recentActions: [],
};


const reasonLabel: Record<string, string> = {
  inappropriate: "부적절한 내용",
  abuse: "욕설/비방",
  spam: "광고/도배",
  copyright: "저작권 침해",
  incorrect: "잘못된 자료",
  other: "기타",
};

const actionLabel: Record<string, string> = {
  warning: "회원 경고",
  hide_post: "게시글 게시 중단",
  delete_comment: "댓글 숨김",
  suspend: "회원 이용 정지",
  unsuspend: "회원 정지 해제",
  ban: "회원 영구 정지",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function StatCard({
  icon,
  title,
  value,
  hint,
  tone = "purple",
}: {
  icon: string;
  title: string;
  value: number;
  hint: string;
  tone?: "purple" | "red" | "blue" | "green";
}) {
  const tones = {
    purple: { bg: "#f2edff", fg: "#6f51d0" },
    red: { bg: "#fff0f2", fg: "#d65368" },
    blue: { bg: "#edf4ff", fg: "#4779d9" },
    green: { bg: "#edf9f2", fg: "#429567" },
  }[tone];

  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: tones.bg, color: tones.fg }}>
        {icon}
      </div>
      <div>
        <div className="admin-stat-title">{title}</div>
        <div className="admin-stat-value">{value.toLocaleString()}</div>
        <div className="admin-stat-hint">{hint}</div>
      </div>
    </article>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        if (!cancelled) {
          setErrorMessage(body.error ?? "대시보드를 불러오지 못했습니다.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setData(body);
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const maxActivity = useMemo(() => {
    const values = data.activity.flatMap((d) => [d.posts, d.comments, d.reports]);
    return Math.max(1, ...values);
  }, [data.activity]);

  const reasonRows = useMemo(() => {
    return Object.entries(data.reportReasons)
      .map(([reason, count]) => ({
        reason,
        label: reasonLabel[reason] ?? reason,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.reportReasons]);

  const totalReasonCount = reasonRows.reduce((sum, row) => sum + row.count, 0);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }


  if (loading) {
    return <div className="admin-loading">관리자 대시보드를 불러오는 중...</div>;
  }

  return (
    <>
      <style jsx global>{`
        .admin-main {
          min-width: 0;
          padding: 24px 32px 60px;
          max-width: 1240px;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .admin-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--cs-ink);
        }

        .admin-subtitle {
          margin: 7px 0 0;
          color: var(--cs-ink-faint);
          font-size: 12.5px;
        }

        .admin-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--cs-surface);
          border: 1px solid var(--cs-border);
          border-radius: var(--cs-radius-lg);
          padding: 7px 10px;
          flex-shrink: 0;
        }

        .admin-avatar {
          width: 28px;
          height: 28px;
          border-radius: var(--cs-radius-full);
          display: grid;
          place-items: center;
          background: var(--cs-purple-bg);
          color: var(--cs-purple-dark);
          font-size: 11px;
          font-weight: 500;
        }

        .admin-profile-name { font-size: 12.5px; color: var(--cs-ink); }
        .admin-profile-email { margin-top: 2px; color: var(--cs-ink-faint); font-size: 11px; }

        .admin-logout {
          border: 0;
          background: transparent;
          color: var(--cs-ink-faint);
          cursor: pointer;
          font-family: inherit;
          font-size: 11.5px;
          padding: 0 0 0 4px;
        }
        .admin-logout:hover { color: var(--cs-ink); }

        .admin-stats {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
        }

        .admin-stat-card {
          background: var(--cs-surface);
          border: 1px solid var(--cs-border);
          border-radius: var(--cs-radius-xl);
          padding: 15px 16px;
        }

        /* 파스텔 아이콘 박스 제거 */
        .admin-stat-icon { display: none; }

        .admin-stat-title { color: var(--cs-ink-soft); font-size: 12px; }
        .admin-stat-value {
          margin-top: 7px;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--cs-ink);
        }
        .admin-stat-hint { margin-top: 5px; color: var(--cs-ink-faint); font-size: 11px; }

        .admin-grid-top {
          margin-top: 12px;
          display: grid;
          grid-template-columns: minmax(0,1.55fr) minmax(315px,.75fr);
          gap: 12px;
          align-items: start;
        }

        .admin-panel {
          background: var(--cs-surface);
          border: 1px solid var(--cs-border);
          border-radius: var(--cs-radius-xl);
          overflow: hidden;
        }

        .admin-panel-header {
          padding: 13px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--cs-border);
        }

        .admin-panel-title { font-size: 12.5px; font-weight: 600; color: var(--cs-ink); }

        .admin-more {
          border: 0;
          background: transparent;
          color: var(--cs-ink-faint);
          cursor: pointer;
          font-family: inherit;
          font-size: 11.5px;
        }
        .admin-more:hover { color: var(--cs-purple-dark); }

        .admin-table-wrap { overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .admin-table th {
          padding: 9px 12px;
          background: var(--cs-card-bg);
          color: var(--cs-ink-faint);
          font-weight: 400;
          text-align: left;
          white-space: nowrap;
        }
        .admin-table td {
          padding: 11px 12px;
          border-top: 1px solid var(--cs-border);
          color: var(--cs-ink-soft);
        }
        .admin-target {
          max-width: 260px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: var(--cs-ink) !important;
          font-weight: 500;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          border-radius: var(--cs-radius-tag);
          padding: 3px 8px;
          font-size: 11px;
          white-space: nowrap;
        }
        .admin-badge.pending { background: var(--cs-trail-bg); color: var(--cs-trail-fg); }
        .admin-badge.resolved { background: var(--cs-ref-bg); color: var(--cs-ref-fg); }
        .admin-badge.rejected { background: var(--cs-sunk); color: var(--cs-ink-soft); }
        .admin-badge.post { background: var(--cs-purple-bg); color: var(--cs-purple-dark); }
        .admin-badge.comment { background: var(--cs-exam-bg); color: var(--cs-exam-fg); }

        .admin-review-list { padding: 2px 0; }
        .admin-review-row {
          width: 100%;
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          border: 0;
          border-bottom: 1px solid var(--cs-border);
          background: var(--cs-surface);
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.1s;
        }
        .admin-review-row:hover { background: var(--cs-hover-row); }
        .admin-review-row:last-child { border-bottom: 0; }
        .admin-review-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--cs-ink);
          font-size: 12.5px;
        }
        .admin-review-sub { margin-top: 4px; color: var(--cs-ink-faint); font-size: 11px; }
        .admin-review-action {
          border: 1px solid var(--cs-border);
          border-radius: var(--cs-radius-sm);
          padding: 4px 9px;
          background: var(--cs-surface);
          color: var(--cs-ink-soft);
          font-size: 11px;
        }

        .admin-grid-bottom {
          margin-top: 12px;
          display: grid;
          grid-template-columns: minmax(0,1.2fr) minmax(300px,.7fr) minmax(300px,.7fr);
          gap: 12px;
        }

        .admin-chart { padding: 16px; }
        .admin-chart-bars {
          height: 170px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid var(--cs-border);
          padding: 12px 5px 0;
          margin-top: 14px;
        }
        .admin-chart-day {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 7px;
        }
        .admin-chart-group {
          height: 130px;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 3px;
        }
        .admin-bar { width: 8px; min-height: 2px; border-radius: 3px 3px 0 0; }
        .admin-bar.posts { background: var(--cs-purple); }
        .admin-bar.comments { background: var(--cs-purple-border); }
        .admin-bar.reports { background: var(--cs-exam-fg); }
        .admin-chart-label { color: var(--cs-ink-faint); font-size: 11px; }
        .admin-chart-legend {
          margin-top: 12px;
          display: flex;
          gap: 14px;
          color: var(--cs-ink-faint);
          font-size: 11px;
        }

        .admin-reason { padding: 16px; }
        .admin-donut-wrap {
          width: 130px;
          height: 130px;
          margin: 16px auto 18px;
          border-radius: var(--cs-radius-full);
          background: conic-gradient(
            var(--cs-purple) 0 40%,
            var(--cs-purple-border) 40% 64%,
            var(--cs-notes-fg) 64% 79%,
            var(--cs-trail-fg) 79% 91%,
            var(--cs-ref-fg) 91% 100%
          );
          display: grid;
          place-items: center;
        }
        .admin-donut-hole {
          width: 82px;
          height: 82px;
          border-radius: var(--cs-radius-full);
          background: var(--cs-surface);
          display: grid;
          place-items: center;
          text-align: center;
        }
        .admin-donut-count {
          font-size: 20px;
          font-weight: 600;
          color: var(--cs-ink);
        }
        .admin-donut-label { color: var(--cs-ink-faint); font-size: 11px; }
        .admin-reason-list { display: grid; gap: 9px; }
        .admin-reason-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--cs-ink-soft);
          font-size: 12px;
        }
        .admin-reason-row strong { font-weight: 500; color: var(--cs-ink); }

        .admin-actions { padding: 4px 16px 12px; }
        .admin-action-row { padding: 11px 0; border-bottom: 1px solid var(--cs-border); }
        .admin-action-row:last-child { border-bottom: 0; }
        .admin-action-title { font-size: 12.5px; color: var(--cs-ink); }
        .admin-action-sub { margin-top: 4px; color: var(--cs-ink-faint); font-size: 11px; }

        .admin-empty {
          padding: 40px 16px;
          text-align: center;
          color: var(--cs-ink-faint);
          font-size: 13.5px;
        }

        .admin-error {
          margin-top: 14px;
          border-radius: var(--cs-radius-md);
          background: var(--cs-exam-bg);
          color: var(--cs-error);
          padding: 11px 13px;
          font-size: 12px;
        }

        .admin-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: var(--cs-bg);
          color: var(--cs-ink-faint);
          font-size: 13.5px;
        }

        @media (max-width: 1180px) {
          .admin-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .admin-grid-top, .admin-grid-bottom { grid-template-columns: 1fr; }
        }

        @media (max-width: 760px) {
          .admin-main { padding: 20px 15px 40px; }
          .admin-stats { grid-template-columns: 1fr 1fr; }
          .admin-profile-email { display: none; }
        }
      `}</style>

        <main className="admin-main">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">관리자 대시보드</h1>
              <p className="admin-subtitle">
                CampusShare 운영 현황을 한눈에 확인하세요.
              </p>
            </div>

            <div className="admin-profile">
              <div className="admin-avatar">
                {(data.admin.nickname || "관").slice(0, 1)}
              </div>
              <div>
                <div className="admin-profile-name">{data.admin.nickname}</div>
                <div className="admin-profile-email">{data.admin.email}</div>
              </div>
              <button type="button" className="admin-logout" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </header>

          {errorMessage && <div className="admin-error">{errorMessage}</div>}

          <section className="admin-stats">
            <StatCard
              icon="!"
              title="처리 대기 신고"
              value={data.stats.pendingReports}
              hint="확인이 필요한 신고"
              tone="red"
            />
            <StatCard
              icon="⌛"
              title="오늘 신규 가입"
              value={data.stats.todaySignups}
              hint="한국 시간 기준"
              tone="purple"
            />
            <StatCard
              icon="○"
              title="전체 회원"
              value={data.stats.activeUsers}
              hint="탈퇴 회원 제외"
              tone="blue"
            />
            <StatCard
              icon="▤"
              title="총 게시글"
              value={data.stats.totalPosts}
              hint={`누적 구매 ${data.stats.totalPurchases.toLocaleString()}건`}
              tone="green"
            />
          </section>

          <section className="admin-grid-top">
            <article className="admin-panel">
              <div className="admin-panel-header">
                <span className="admin-panel-title">최근 신고 접수 내역</span>
                <button
                  type="button"
                  className="admin-more"
                  onClick={() => router.push("/admin/reports")}
                >
                  전체 보기 →
                </button>
              </div>

              {data.recentReports.length === 0 ? (
                <div className="admin-empty">접수된 신고가 없습니다.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>유형</th>
                        <th>대상</th>
                        <th>신고 사유</th>
                        <th>신고자</th>
                        <th>접수 시간</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentReports.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <span
                              className={`admin-badge ${
                                report.target_type === "post" ? "post" : "comment"
                              }`}
                            >
                              {report.target_type === "post" ? "게시글" : "댓글"}
                            </span>
                          </td>
                          <td className="admin-target">{report.target_label}</td>
                          <td>{reasonLabel[report.reason] ?? report.reason}</td>
                          <td>{report.reporter_nickname}</td>
                          <td>{formatDate(report.created_at)}</td>
                          <td>
                            <span className={`admin-badge ${report.status}`}>
                              {report.status === "pending"
                                ? "검토 대기"
                                : report.status === "resolved"
                                  ? "처리 완료"
                                  : "기각"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="admin-panel">
              <div className="admin-panel-header">
                <span className="admin-panel-title">검토 대기 콘텐츠</span>
                <button
                  type="button"
                  className="admin-more"
                  onClick={() => router.push("/admin/reports")}
                >
                  전체 보기 →
                </button>
              </div>

              <div className="admin-review-list">
                {data.recentReports
                  .filter((report) => report.status === "pending")
                  .slice(0, 5)
                  .map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      className="admin-review-row"
                      onClick={() => router.push(`/admin/reports?report=${report.id}`)}
                    >
                      <span
                        className={`admin-badge ${
                          report.target_type === "post" ? "post" : "comment"
                        }`}
                      >
                        {report.target_type === "post" ? "게시글" : "댓글"}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <div className="admin-review-title">{report.target_label}</div>
                        <div className="admin-review-sub">
                          {reasonLabel[report.reason] ?? report.reason} ·{" "}
                          {formatDate(report.created_at)}
                        </div>
                      </span>

                      <span className="admin-review-action">검토</span>
                    </button>
                  ))}

                {!data.recentReports.some((report) => report.status === "pending") && (
                  <div className="admin-empty">현재 검토 대기 신고가 없습니다.</div>
                )}
              </div>
            </article>
          </section>

          <section className="admin-grid-bottom">
            <article className="admin-panel admin-chart">
              <div className="admin-panel-title">최근 7일 활동 현황</div>

              <div className="admin-chart-bars">
                {data.activity.map((day) => (
                  <div className="admin-chart-day" key={day.key}>
                    <div className="admin-chart-group">
                      <div
                        className="admin-bar posts"
                        title={`게시글 ${day.posts}`}
                        style={{
                          height: `${Math.max(3, (day.posts / maxActivity) * 100)}%`,
                        }}
                      />
                      <div
                        className="admin-bar comments"
                        title={`댓글 ${day.comments}`}
                        style={{
                          height: `${Math.max(3, (day.comments / maxActivity) * 100)}%`,
                        }}
                      />
                      <div
                        className="admin-bar reports"
                        title={`신고 ${day.reports}`}
                        style={{
                          height: `${Math.max(3, (day.reports / maxActivity) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="admin-chart-label">{day.label}</span>
                  </div>
                ))}
              </div>

              <div className="admin-chart-legend">
                <span>● 게시글</span>
                <span>● 댓글</span>
                <span>● 신고</span>
              </div>
            </article>

            <article className="admin-panel admin-reason">
              <div className="admin-panel-title">신고 유형 비율</div>

              <div className="admin-donut-wrap">
                <div className="admin-donut-hole">
                  <div>
                    <div className="admin-donut-label">최근 7일</div>
                    <div className="admin-donut-count">{totalReasonCount}</div>
                    <div className="admin-donut-label">건</div>
                  </div>
                </div>
              </div>

              <div className="admin-reason-list">
                {reasonRows.length === 0 ? (
                  <div className="admin-empty">신고 데이터가 없습니다.</div>
                ) : (
                  reasonRows.slice(0, 6).map((row) => (
                    <div className="admin-reason-row" key={row.reason}>
                      <span>{row.label}</span>
                      <strong>
                        {row.count}건{" "}
                        {totalReasonCount > 0
                          ? `(${Math.round((row.count / totalReasonCount) * 100)}%)`
                          : ""}
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-header">
                <span className="admin-panel-title">최근 관리자 활동</span>
              </div>

              <div className="admin-actions">
                {data.recentActions.length === 0 ? (
                  <div className="admin-empty">아직 관리자 조치 이력이 없습니다.</div>
                ) : (
                  data.recentActions.map((action) => (
                    <div className="admin-action-row" key={action.id}>
                      <div className="admin-action-title">
                        {actionLabel[action.action_type] ?? action.action_type}
                      </div>
                      <div className="admin-action-sub">
                        {action.reason || "운영 정책에 따른 조치"} ·{" "}
                        {formatDate(action.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </main>
    </>
  );
}
