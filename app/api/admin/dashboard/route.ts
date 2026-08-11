import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: string;
  status: "pending" | "resolved" | "rejected";
  created_at: string;
};

function getKstTodayStartIso() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const year = kstNow.getUTCFullYear();
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstNow.getUTCDate()).padStart(2, "0");

  // 한국 자정 = UTC 전날 15:00
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  const todayStart = getKstTodayStartIso();

  const [
    activeUsersResult,
    postsResult,
    purchasesResult,
    todayUsersResult,
    pendingReportsResult,
    recentReportsResult,
    recentActionsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false),

    supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true }),

    supabaseAdmin
      .from("post_purchases")
      .select("id", { count: "exact", head: true }),

    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),

    supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabaseAdmin
      .from("reports")
      .select(
        "id, reporter_id, target_type, target_id, reason, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(7),

    supabaseAdmin
      .from("moderation_actions")
      .select(
        "id, action_type, target_type, target_id, target_user_id, reason, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const errors = [
    activeUsersResult.error,
    postsResult.error,
    purchasesResult.error,
    todayUsersResult.error,
    pendingReportsResult.error,
    recentReportsResult.error,
    recentActionsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("admin dashboard query error", errors);
    return NextResponse.json(
      { error: "관리자 대시보드 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const reports = (recentReportsResult.data ?? []) as ReportRow[];

  const postIds = reports
    .filter((r) => r.target_type === "post")
    .map((r) => r.target_id);

  const commentIds = reports
    .filter((r) => r.target_type === "comment")
    .map((r) => r.target_id);

  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];

  const [posts, comments, reporters] = await Promise.all([
    postIds.length
      ? supabaseAdmin
          .from("posts")
          .select("id, title, author_id")
          .in("id", postIds)
      : Promise.resolve({ data: [], error: null }),

    commentIds.length
      ? supabaseAdmin
          .from("comments")
          .select("id, content, author_id")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),

    reporterIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, nickname")
          .in("id", reporterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const postMap = new Map((posts.data ?? []).map((p: any) => [p.id, p]));
  const commentMap = new Map(
    (comments.data ?? []).map((c: any) => [c.id, c]),
  );
  const reporterMap = new Map(
    (reporters.data ?? []).map((p: any) => [p.id, p.nickname]),
  );

  const recentReports = reports.map((report) => {
    if (report.target_type === "post") {
      const target = postMap.get(report.target_id) as any;

      return {
        ...report,
        target_label: target?.title ?? "삭제되었거나 찾을 수 없는 게시글",
        reporter_nickname:
          reporterMap.get(report.reporter_id) ?? "알 수 없는 사용자",
      };
    }

    const target = commentMap.get(report.target_id) as any;
    const content = target?.content ?? "";

    return {
      ...report,
      target_label:
        content.length > 34 ? `${content.slice(0, 34)}…` : content || "삭제된 댓글",
      reporter_nickname:
        reporterMap.get(report.reporter_id) ?? "알 수 없는 사용자",
    };
  });

  // 차트는 MVP용 최근 7일 집계. 서버에서 간단히 계산합니다.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [recentPosts, recentComments, recentReportRows] = await Promise.all([
    supabaseAdmin
      .from("posts")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString()),

    supabaseAdmin
      .from("comments")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString()),

    supabaseAdmin
      .from("reports")
      .select("created_at, reason")
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    const key = date.toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });

    return {
      key,
      label: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
        date.getDate(),
      ).padStart(2, "0")}`,
      posts: 0,
      comments: 0,
      reports: 0,
    };
  });

  const byDate = new Map(days.map((day) => [day.key, day]));

  for (const row of recentPosts.data ?? []) {
    const key = new Date(row.created_at).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    const day = byDate.get(key);
    if (day) day.posts += 1;
  }

  for (const row of recentComments.data ?? []) {
    const key = new Date(row.created_at).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    const day = byDate.get(key);
    if (day) day.comments += 1;
  }

  const reasonCounts: Record<string, number> = {};

  for (const row of recentReportRows.data ?? []) {
    const key = new Date(row.created_at).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    const day = byDate.get(key);
    if (day) day.reports += 1;

    reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1;
  }

  return NextResponse.json({
    admin: {
      nickname: auth.profile.nickname,
      email: auth.user.email,
    },
    stats: {
      activeUsers: activeUsersResult.count ?? 0,
      totalPosts: postsResult.count ?? 0,
      totalPurchases: purchasesResult.count ?? 0,
      todaySignups: todayUsersResult.count ?? 0,
      pendingReports: pendingReportsResult.count ?? 0,
    },
    activity: days,
    reportReasons: reasonCounts,
    recentReports,
    recentActions: recentActionsResult.data ?? [],
  });
}
