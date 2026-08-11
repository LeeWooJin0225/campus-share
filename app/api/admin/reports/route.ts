import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type ProfileRow = {
  id: string;
  nickname: string | null;
  is_deleted: boolean | null;
};

type PostRow = {
  id: string;
  author_id: string;
  title: string;
  is_admin_hidden: boolean | null;
  is_published: boolean;
};

function displayNickname(
  profile: ProfileRow | undefined,
) {
  if (!profile) return "알 수 없음";
  if (profile.is_deleted) return "탈퇴한 사용자";

  return profile.nickname ?? "익명";
}

export async function GET(
  request: NextRequest,
) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  const { searchParams } =
    new URL(request.url);

  const status =
    searchParams.get("status") ?? "all";

  let query = supabaseAdmin
    .from("reports")
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      description,
      status,
      created_at,
      resolved_at,
      resolved_by
    `)
    .eq("target_type", "post")
    .order("created_at", {
      ascending: false,
    });

  if (
    status === "pending" ||
    status === "resolved" ||
    status === "rejected"
  ) {
    query = query.eq("status", status);
  }

  const {
    data: reportRows,
    error: reportError,
  } = await query;

  if (reportError) {
    console.error(
      "관리자 신고 목록 조회 실패:",
      reportError,
    );

    return NextResponse.json(
      { error: reportError.message },
      { status: 500 },
    );
  }

  const rows = reportRows ?? [];

  const postIds = Array.from(
    new Set(
      rows.map((row) => row.target_id),
    ),
  );

  const reporterIds = Array.from(
    new Set(
      rows.map((row) => row.reporter_id),
    ),
  );

  let posts: PostRow[] = [];

  if (postIds.length > 0) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("posts")
      .select(`
        id,
        author_id,
        title,
        is_admin_hidden,
        is_published
      `)
      .in("id", postIds);

    if (error) {
      console.error(
        "신고 대상 게시글 조회 실패:",
        error,
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    posts =
      (data ?? []) as PostRow[];
  }

  const authorIds = posts.map(
    (post) => post.author_id,
  );

  const profileIds = Array.from(
    new Set([
      ...reporterIds,
      ...authorIds,
    ]),
  );

  let profiles: ProfileRow[] = [];

  if (profileIds.length > 0) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        nickname,
        is_deleted
      `)
      .in("id", profileIds);

    if (error) {
      console.error(
        "신고 관련 프로필 조회 실패:",
        error,
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    profiles =
      (data ?? []) as ProfileRow[];
  }

  const postMap = new Map(
    posts.map((post) => [
      post.id,
      post,
    ]),
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const reports = rows.map((row) => {
    const post =
      postMap.get(row.target_id);

    const reporter =
      profileMap.get(row.reporter_id);

    const author = post
      ? profileMap.get(post.author_id)
      : undefined;

    return {
      id: row.id,

      reporter_id:
        row.reporter_id,
      reporter_nickname:
        displayNickname(reporter),

      target_type:
        row.target_type,
      target_id:
        row.target_id,

      reason:
        row.reason,
      description:
        row.description,
      status:
        row.status,
      created_at:
        row.created_at,
      resolved_at:
        row.resolved_at,
      resolved_by:
        row.resolved_by,

      post_id:
        post?.id ?? null,
      post_title:
        post?.title ??
        "삭제된 게시글",
      post_is_admin_hidden:
        post?.is_admin_hidden ??
        false,
      post_is_published:
        post?.is_published ??
        false,

      reported_user_id:
        post?.author_id ?? null,
      reported_user_nickname:
        displayNickname(author),
    };
  });

  return NextResponse.json({
    reports,
  });
}
