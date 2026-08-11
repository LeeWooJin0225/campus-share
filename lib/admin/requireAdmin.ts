import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false as const,
      status: 401,
      error: "로그인이 필요합니다.",
    };
  }

  const accessToken = authorization.slice("Bearer ".length);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "유효하지 않은 로그인 정보입니다.",
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, nickname, avatar_url, role, is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_deleted) {
    return {
      ok: false as const,
      status: 403,
      error: "사용자 정보를 확인할 수 없습니다.",
    };
  }

  if (profile.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      error: "관리자 권한이 없습니다.",
    };
  }

  return {
    ok: true as const,
    user,
    profile,
    accessToken,
  };
}
