import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/admin/supabaseAdmin";

type OneOrMany<T> = T | T[] | null;

function pickOne<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  /*
   * 1) posts에서는 course_offering_id만 가져옵니다.
   *    과목/교수 관계를 posts 쿼리에 한 번에 중첩하지 않고
   *    course_offerings를 별도로 조회해서 확실하게 매핑합니다.
   */
  const { data: postRows, error: postError } = await supabaseAdmin
    .from("posts")
    .select(`
      id,
      title,
      post_type,
      created_at,
      author_id,
      course_offering_id,
      is_published,
      is_admin_hidden,
      moderation_reason,
      profiles:profiles!posts_author_id_fkey (
        nickname,
        is_deleted
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (postError) {
    console.error("관리자 게시글 조회 실패:", postError);

    return NextResponse.json(
      { error: postError.message },
      { status: 500 },
    );
  }

  const posts = postRows ?? [];
  const postIds = posts.map((row) => row.id);

  const courseOfferingIds = [
    ...new Set(
      posts
        .map((row) => row.course_offering_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  /*
   * 2) course_offerings -> subjects / professors
   *    이 구조는 기존 사용자 화면에서 사용 중인 구조와 동일합니다.
   */
  const { data: offeringRows, error: offeringError } =
    courseOfferingIds.length > 0
      ? await supabaseAdmin
          .from("course_offerings")
          .select(`
            id,
            subject_id,
            subjects (
              id,
              name
            ),
            professors (
              id,
              name
            )
          `)
          .in("id", courseOfferingIds)
      : { data: [], error: null };

  if (offeringError) {
    console.error("관리자 과목/교수 조회 실패:", offeringError);

    return NextResponse.json(
      { error: offeringError.message },
      { status: 500 },
    );
  }

  const offeringMap = new Map<
    string,
    {
      subjectName: string;
      professorName: string;
    }
  >();

  for (const row of offeringRows ?? []) {
    const subject = pickOne(row.subjects);
    const professor = pickOne(row.professors);

    offeringMap.set(row.id, {
      subjectName: subject?.name ?? "과목명 없음",
      professorName: professor?.name ?? "교수 미정",
    });
  }

  /*
   * 3) 구매 수
   */
  const { data: purchaseRows, error: purchaseError } =
    postIds.length > 0
      ? await supabaseAdmin
          .from("post_purchases")
          .select("post_id")
          .in("post_id", postIds)
      : { data: [], error: null };

  if (purchaseError) {
    return NextResponse.json(
      { error: purchaseError.message },
      { status: 500 },
    );
  }

  const purchaseCounts = new Map<string, number>();

  for (const purchase of purchaseRows ?? []) {
    purchaseCounts.set(
      purchase.post_id,
      (purchaseCounts.get(purchase.post_id) ?? 0) + 1,
    );
  }

  /*
   * 4) 관리자 페이지가 사용하는 형태로 합칩니다.
   */
  const result = posts.map((row) => {
    const profile = pickOne(row.profiles);
    const courseInfo = row.course_offering_id
      ? offeringMap.get(row.course_offering_id)
      : undefined;

    return {
      id: row.id,
      title: row.title,
      post_type: row.post_type,
      created_at: row.created_at,
      author_id: row.author_id,
      course_offering_id: row.course_offering_id,
      is_published: row.is_published,
      is_admin_hidden: row.is_admin_hidden ?? false,
      moderation_reason: row.moderation_reason ?? null,

      author_nickname: profile?.nickname ?? "익명",
      author_is_deleted: profile?.is_deleted ?? false,

      subject_name: courseInfo?.subjectName ?? "과목명 없음",
      professor_name: courseInfo?.professorName ?? "교수 미정",

      purchase_count: purchaseCounts.get(row.id) ?? 0,
    };
  });

  return NextResponse.json({ posts: result });
}
