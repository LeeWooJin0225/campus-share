import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      nickname,
      created_at,
      is_deleted,
      role,
      account_status,
      suspended_until
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  const userIds = (profiles ?? []).map((profile) => profile.id);

  const [{ data: postRows, error: postError }, { data: commentRows, error: commentError }] =
    await Promise.all([
      userIds.length
        ? supabaseAdmin.from("posts").select("author_id").in("author_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabaseAdmin.from("comments").select("author_id").in("author_id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (postError || commentError) {
    return NextResponse.json(
      { error: postError?.message ?? commentError?.message ?? "활동 수 조회 실패" },
      { status: 500 },
    );
  }

  const postCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();

  for (const row of postRows ?? []) {
    postCounts.set(row.author_id, (postCounts.get(row.author_id) ?? 0) + 1);
  }

  for (const row of commentRows ?? []) {
    commentCounts.set(row.author_id, (commentCounts.get(row.author_id) ?? 0) + 1);
  }

  const users = [];

  for (const profile of profiles ?? []) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    users.push({
      id: profile.id,
      nickname: profile.nickname,
      email: authUser.user?.email ?? null,
      created_at: profile.created_at,
      is_deleted: profile.is_deleted ?? false,
      role: profile.role ?? "user",
      account_status: profile.account_status ?? "active",
      suspended_until: profile.suspended_until ?? null,
      post_count: postCounts.get(profile.id) ?? 0,
      comment_count: commentCounts.get(profile.id) ?? 0,
    });
  }

  return NextResponse.json({ users });
}
