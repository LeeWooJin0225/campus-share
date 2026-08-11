import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

const ALLOWED_REASONS = [
  "inappropriate",
  "abuse",
  "spam",
  "copyright",
  "incorrect",
  "other",
] as const;

type ReportReason = (typeof ALLOWED_REASONS)[number];

export async function POST(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") ?? "";

  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "로그인 정보를 확인할 수 없습니다." },
      { status: 401 },
    );
  }

  const body = await request.json();

  const postId =
    typeof body.postId === "string"
      ? body.postId
      : "";

  const reason =
    typeof body.reason === "string"
      ? (body.reason as ReportReason)
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  if (!postId) {
    return NextResponse.json(
      { error: "신고할 게시글이 없습니다." },
      { status: 400 },
    );
  }

  if (
    !ALLOWED_REASONS.includes(
      reason as ReportReason,
    )
  ) {
    return NextResponse.json(
      { error: "올바르지 않은 신고 사유입니다." },
      { status: 400 },
    );
  }

  if (reason === "other" && !description) {
    return NextResponse.json(
      { error: "기타 신고 사유를 입력해 주세요." },
      { status: 400 },
    );
  }

  const { data: post, error: postError } =
    await supabaseAdmin
      .from("posts")
      .select(`
        id,
        author_id,
        is_admin_hidden
      `)
      .eq("id", postId)
      .maybeSingle();

  if (postError) {
    return NextResponse.json(
      { error: postError.message },
      { status: 500 },
    );
  }

  if (!post) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (post.author_id === user.id) {
    return NextResponse.json(
      { error: "내 게시글은 신고할 수 없습니다." },
      { status: 400 },
    );
  }

  if (post.is_admin_hidden) {
    return NextResponse.json(
      { error: "이미 관리자에 의해 중단된 게시글입니다." },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", "post")
      .eq("target_id", postId)
      .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "이미 신고한 게시글입니다." },
      { status: 409 },
    );
  }

  const { data: report, error: insertError } =
    await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id: user.id,
        target_type: "post",
        target_id: postId,
        reason,
        description:
          description || null,
      })
      .select("id")
      .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "이미 신고한 게시글입니다." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reportId: report.id,
  });
}
