import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

export async function GET(request: NextRequest) {
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

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        role,
        is_deleted,
        account_status,
        suspended_until
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  if (!profile || profile.is_deleted) {
    return NextResponse.json(
      { error: "사용할 수 없는 계정입니다." },
      { status: 401 },
    );
  }

  let accountStatus =
    profile.account_status ??
    "active";

  let suspendedUntil =
    profile.suspended_until ?? null;

  if (
    accountStatus === "suspended" &&
    suspendedUntil &&
    new Date(suspendedUntil).getTime() <= Date.now()
  ) {
    const { error: restoreError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          account_status: "active",
          suspended_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (restoreError) {
      return NextResponse.json(
        { error: restoreError.message },
        { status: 500 },
      );
    }

    accountStatus = "active";
    suspendedUntil = null;
  }

  return NextResponse.json({
    account_status: accountStatus,
    suspended_until: suspendedUntil,
    role: profile.role,
  });
}
