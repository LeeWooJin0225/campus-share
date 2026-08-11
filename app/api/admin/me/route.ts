import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  return NextResponse.json({
    admin: {
      id: auth.user.id,
      email: auth.user.email,
      nickname: auth.profile.nickname,
      avatarUrl: auth.profile.avatar_url,
    },
  });
}
