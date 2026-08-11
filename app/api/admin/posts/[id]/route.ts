import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type RouteContext = {
  params: {
    id: string;
  };
};

type OneOrMany<T> = T | T[] | null;

function pickOne<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function GET(
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

  const postId = context.params.id;

  const { data: postRow, error: postError } = await supabaseAdmin
    .from("posts")
    .select(`
      id,
      author_id,
      course_offering_id,
      post_type,
      title,
      content,
      price,
      created_at,
      updated_at,
      is_published,
      is_admin_hidden,
      moderation_reason,
      moderated_at,
      profiles:profiles!posts_author_id_fkey (
        nickname,
        is_deleted
      ),
      course_offerings (
        id,
        subjects (
          name,
          subject_code
        ),
        professors (
          name
        ),
        semesters (
          year,
          term
        )
      )
    `)
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return NextResponse.json(
      { error: postError.message },
      { status: 500 },
    );
  }

  if (!postRow) {
    return NextResponse.json(
      { error: "게시글을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const [attachmentResult, purchaseCountResult] = await Promise.all([
    supabaseAdmin
      .from("post_attachments")
      .select(`
        id,
        original_name,
        storage_path,
        mime_type,
        size_bytes,
        display_order
      `)
      .eq("post_id", postId)
      .order("display_order", { ascending: true }),

    supabaseAdmin
      .from("post_purchases")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("post_id", postId),
  ]);

  if (attachmentResult.error) {
    return NextResponse.json(
      { error: attachmentResult.error.message },
      { status: 500 },
    );
  }

  if (purchaseCountResult.error) {
    return NextResponse.json(
      { error: purchaseCountResult.error.message },
      { status: 500 },
    );
  }

  const attachments = await Promise.all(
    (attachmentResult.data ?? []).map(async (attachment) => {
      const { data: signedData, error: signedError } =
        await supabaseAdmin.storage
          .from("post-files")
          .createSignedUrl(
            attachment.storage_path,
            60 * 10,
            {
              download: attachment.original_name,
            },
          );

      if (signedError) {
        console.error(
          "관리자 첨부파일 signed URL 생성 실패:",
          signedError,
        );
      }

      return {
        id: attachment.id,
        original_name: attachment.original_name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes ?? 0,
        display_order: attachment.display_order ?? 0,
        signed_url: signedData?.signedUrl ?? null,
      };
    }),
  );

  const profile = pickOne(postRow.profiles);
  const offering = pickOne(postRow.course_offerings);
  const subject = offering ? pickOne(offering.subjects) : null;
  const professor = offering ? pickOne(offering.professors) : null;
  const semester = offering ? pickOne(offering.semesters) : null;

  return NextResponse.json({
    post: {
      id: postRow.id,
      author_id: postRow.author_id,
      title: postRow.title,
      content: postRow.content ?? "",
      post_type: postRow.post_type,
      price: postRow.price ?? 1,
      created_at: postRow.created_at,
      updated_at: postRow.updated_at ?? null,
      is_published: postRow.is_published,
      is_admin_hidden: postRow.is_admin_hidden ?? false,
      moderation_reason: postRow.moderation_reason ?? null,
      moderated_at: postRow.moderated_at ?? null,

      author_nickname: profile?.is_deleted
        ? "탈퇴한 사용자"
        : profile?.nickname ?? "익명",
      author_is_deleted: profile?.is_deleted ?? false,

      subject_name: subject?.name ?? "과목명 없음",
      subject_code: subject?.subject_code ?? null,
      professor_name: professor?.name ?? "교수 미정",
      semester_label: semester
        ? `${semester.year}-${semester.term}학기`
        : "학기 미지정",

      purchase_count: purchaseCountResult.count ?? 0,
      attachments,
    },
  });
}

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

  try {
    const body = await request.json();

    const isAdminHidden = body.isAdminHidden === true;

    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .select("id, is_admin_hidden")
      .eq("id", context.params.id)
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

    let refundedCount = 0;
    let refundedPoints = 0;

    if (isAdminHidden) {
      const { data: refundData, error: refundError } =
        await supabaseAdmin.rpc(
          "admin_hide_post_with_refunds",
          {
            target_post_id: context.params.id,
            moderator_id: auth.user.id,
            reason_text: reason ?? "운영 정책 위반",
          },
        );

      if (refundError) {
        return NextResponse.json(
          { error: refundError.message },
          { status: 500 },
        );
      }

      const result = Array.isArray(refundData)
        ? refundData[0]
        : refundData;

      refundedCount = result?.refunded_count ?? 0;
      refundedPoints = result?.refunded_points ?? 0;
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("posts")
        .update({
          is_admin_hidden: false,
          moderation_reason: null,
          moderated_at: null,
          moderated_by: null,
        })
        .eq("id", context.params.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }
    }

    const { error: actionError } = await supabaseAdmin
      .from("moderation_actions")
      .insert({
        admin_id: auth.user.id,
        target_type: "post",
        target_id: context.params.id,
        action_type: isAdminHidden
          ? "hide_post"
          : "restore_post",
        reason: isAdminHidden
          ? reason ?? "운영 정책 위반"
          : "관리자 게시 중단 해제",
      });

    if (actionError) {
      console.error(
        "관리자 조치 이력 저장 실패:",
        actionError,
      );
    }

    return NextResponse.json({
      ok: true,
      post: {
        id: context.params.id,
        is_admin_hidden: isAdminHidden,
        moderation_reason: isAdminHidden
          ? reason ?? "운영 정책 위반"
          : null,
      },
      refund: {
        refunded_count: refundedCount,
        refunded_points: refundedPoints,
      },
    });
  } catch (error) {
    console.error(
      "관리자 게시글 상태 변경 실패:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "게시글 상태를 변경하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
