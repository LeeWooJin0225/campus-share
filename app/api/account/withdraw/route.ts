import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return NextResponse.json(
      { error: "로그인 정보가 없습니다." },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "서버 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "사용자 정보를 확인할 수 없습니다." },
      { status: 401 },
    );
  }

  const { data: currentProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("nickname, avatar_url, is_deleted, withdrawn_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return NextResponse.json(
      { error: profileReadError.message },
      { status: 500 },
    );
  }

  if (currentProfile?.is_deleted) {
    return NextResponse.json({ ok: true });
  }

  const internalNickname = `withdrawn_${user.id.replaceAll("-", "").slice(0, 12)}`;
  const withdrawnAt = new Date().toISOString();

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      nickname: internalNickname,
      avatar_url: null,
      is_deleted: true,
      withdrawn_at: withdrawnAt,
      updated_at: withdrawnAt,
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    return NextResponse.json(
      { error: profileUpdateError.message },
      { status: 500 },
    );
  }

  // 남아 있는 포인트는 탈퇴와 함께 소멸합니다.
  const { error: walletError } = await admin
    .from("point_wallets")
    .update({ balance: 0, updated_at: withdrawnAt })
    .eq("user_id", user.id);

  if (walletError) {
    console.error("탈퇴 사용자 포인트 초기화 실패:", walletError);
  }

  // auth.users 행은 유지해서 posts / purchases 등의 관계를 깨지 않고,
  // 장기간 ban 처리하여 다시 로그인할 수 없게 합니다.
  const { error: banError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      ban_duration: "876000h",
      user_metadata: {
        ...(user.user_metadata ?? {}),
        withdrawn: true,
        withdrawn_at: withdrawnAt,
      },
    },
  );

  if (banError) {
    // 인증 차단에 실패하면 프로필 상태를 가능한 범위에서 되돌립니다.
    await admin
      .from("profiles")
      .update({
        nickname: currentProfile?.nickname ?? internalNickname,
        avatar_url: currentProfile?.avatar_url ?? null,
        is_deleted: currentProfile?.is_deleted ?? false,
        withdrawn_at: currentProfile?.withdrawn_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json(
      { error: "계정 비활성화에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
