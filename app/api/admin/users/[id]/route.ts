import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type RouteContext = {
  params: {
    id: string;
  };
};

type Action = "suspend7" | "suspend30" | "unsuspend" | "ban";

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  if (context.params.id === auth.user.id) {
    return NextResponse.json(
      { error: "현재 로그인한 관리자 계정은 이 화면에서 제재할 수 없습니다." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const action = body.action as Action;
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "운영 정책에 따른 조치";

  if (!["suspend7", "suspend30", "unsuspend", "ban"].includes(action)) {
    return NextResponse.json(
      { error: "올바르지 않은 관리자 조치입니다." },
      { status: 400 },
    );
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_deleted")
    .eq("id", context.params.id)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json(
      { error: "회원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (targetProfile.role === "admin") {
    return NextResponse.json(
      { error: "관리자 계정은 이 화면에서 제재할 수 없습니다." },
      { status: 400 },
    );
  }

  if (targetProfile.is_deleted) {
    return NextResponse.json(
      { error: "이미 탈퇴한 회원입니다." },
      { status: 400 },
    );
  }

  let accountStatus: "active" | "suspended" | "banned";
  let suspendedUntil: string | null;
  let actionType: string;

  if (action === "suspend7" || action === "suspend30") {
    const days = action === "suspend7" ? 7 : 30;
    const until = new Date();
    until.setDate(until.getDate() + days);

    accountStatus = "suspended";
    suspendedUntil = until.toISOString();
    actionType = "suspend";
  } else if (action === "ban") {
    accountStatus = "banned";
    suspendedUntil = null;
    actionType = "ban";
  } else {
    accountStatus = "active";
    suspendedUntil = null;
    actionType = "unsuspend";
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      account_status: accountStatus,
      suspended_until: suspendedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.params.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  const { error: actionError } = await supabaseAdmin
    .from("moderation_actions")
    .insert({
      admin_id: auth.user.id,
      target_user_id: context.params.id,
      target_type: "user",
      target_id: context.params.id,
      action_type: actionType,
      reason,
      expires_at: suspendedUntil,
    });

  if (actionError) {
    console.error("관리자 조치 이력 저장 실패:", actionError);
  }

  return NextResponse.json({
    ok: true,
    user: {
      account_status: accountStatus,
      suspended_until: suspendedUntil,
    },
  });
}
