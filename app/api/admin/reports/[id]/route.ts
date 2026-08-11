import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type RouteContext = {
  params: {
    id: string;
  };
};

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

  const body = await request.json();

  const nextStatus =
    body.status === "resolved" ||
    body.status === "rejected"
      ? body.status
      : null;

  if (!nextStatus) {
    return NextResponse.json(
      { error: "올바르지 않은 신고 처리 상태입니다." },
      { status: 400 },
    );
  }

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from("reports")
    .select(`
      id,
      target_type,
      target_id
    `)
    .eq("id", context.params.id)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      { status: 500 },
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: "신고를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const resolvedAt =
    new Date().toISOString();

  /*
   * 같은 대상에 대해 아직 처리 대기 중인 신고를
   * 한 번에 모두 처리합니다.
   *
   * 예:
   * target_type = "post"
   * target_id = 같은 게시글 UUID
   */
  const {
    data: updatedReports,
    error: updateError,
  } = await supabaseAdmin
    .from("reports")
    .update({
      status: nextStatus,
      resolved_at: resolvedAt,
      resolved_by: auth.user.id,
    })
    .eq(
      "target_type",
      report.target_type,
    )
    .eq(
      "target_id",
      report.target_id,
    )
    .eq("status", "pending")
    .select("id");

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    target: {
      type: report.target_type,
      id: report.target_id,
    },
    status: nextStatus,
    processed_count:
      updatedReports?.length ?? 0,
    processed_report_ids:
      (updatedReports ?? []).map(
        (item) => item.id,
      ),
  });
}
