import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_PDF_FILES = 5;
const MIN_BODY_LENGTH = 80;
const MIN_UNIQUE_CHARS = 15;

function hasMeaningfulText(text: string) {
  const normalized =
    text.replace(/\s/g, "");

  if (normalized.length < MIN_BODY_LENGTH) {
    return false;
  }

  const uniqueChars =
    new Set(normalized).size;

  return uniqueChars >= MIN_UNIQUE_CHARS;
}

function htmlToPlainText(html: string | null) {
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;

    const authorization =
      request.headers.get("authorization");

    const token =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    if (!token) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "사용자 인증에 실패했습니다." },
        { status: 401 },
      );
    }

    /* 게시글 조회 */
    const { data: post, error: postError } =
      await supabaseAdmin
        .from("posts")
        .select(`
          id,
          author_id,
          title,
          content,
          ai_summary,
          is_published
        `)
        .eq("id", postId)
        .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    /* 이미 생성된 요약은 재사용 */
    if (post.ai_summary) {
      return NextResponse.json({
        summary: post.ai_summary,
        cached: true,
      });
    }

    /* 작성자 또는 구매자만 사용 가능 */
    const isAuthor =
      post.author_id === user.id;

    let hasPurchased = false;

    if (!isAuthor) {
      const { data: purchase, error: purchaseError } =
        await supabaseAdmin
          .from("post_purchases")
          .select("id")
          .eq("post_id", postId)
          .eq("buyer_id", user.id)
          .maybeSingle();

      if (purchaseError) {
        throw purchaseError;
      }

      hasPurchased = Boolean(purchase);
    }

    if (!isAuthor && !hasPurchased) {
      return NextResponse.json(
        {
          error:
            "구매한 사용자만 AI 요약을 생성할 수 있습니다.",
        },
        { status: 403 },
      );
    }

    /* 게시글 본문을 평문으로 변환 */
    const bodyText =
      htmlToPlainText(post.content);

    /* 첨부파일 조회 */
    const {
      data: attachments,
      error: attachmentError,
    } = await supabaseAdmin
      .from("post_attachments")
      .select(`
        id,
        original_name,
        storage_path,
        mime_type
      `)
      .eq("post_id", postId)
      .order("display_order", {
        ascending: true,
      });

    if (attachmentError) {
      throw attachmentError;
    }

    /* PDF만 AI 입력 대상으로 사용 */
    const pdfAttachments =
      (attachments ?? [])
        .filter(
          (item) =>
            item.mime_type === "application/pdf" ||
            item.original_name
              .toLowerCase()
              .endsWith(".pdf"),
        )
        .slice(0, MAX_PDF_FILES);

    const hasMeaningfulBody =
      hasMeaningfulText(bodyText);

    const hasPdf =
      pdfAttachments.length > 0;

    /*
     * 비용 방지용 사전 검사
     * - PDF가 없고
     * - 본문도 충분하지 않으면
     * OpenAI를 호출하지 않고 여기서 종료합니다.
     */
    if (!hasMeaningfulBody && !hasPdf) {
      return NextResponse.json(
        {
          error:
            "AI로 요약할 내용이 부족합니다. 본문에 충분한 학습 내용을 작성하거나 PDF를 첨부해 주세요.",
          code: "INSUFFICIENT_CONTENT",
        },
        { status: 400 },
      );
    }

    /*
     * Responses API에 넘길 content 구성
     * 1) 의미 있는 게시글 본문
     * 2) 첨부 PDF 여러 개
     */
    const inputContent: Array<
      | {
          type: "input_text";
          text: string;
        }
      | {
          type: "input_file";
          file_id: string;
        }
    > = [];

    if (hasMeaningfulBody) {
      inputContent.push({
        type: "input_text",
        text: `
[게시글 제목]
${post.title}

[게시글 본문]
${bodyText}
        `.trim(),
      });
    }

    const uploadedFileNames: string[] = [];

    for (const attachment of pdfAttachments) {
      const {
        data: fileBlob,
        error: downloadError,
      } = await supabaseAdmin.storage
        .from("post-files")
        .download(attachment.storage_path);

      if (downloadError || !fileBlob) {
        console.error(
          `PDF 다운로드 실패: ${attachment.original_name}`,
          downloadError,
        );
        continue;
      }

      const file = new File(
        [fileBlob],
        attachment.original_name,
        {
          type:
            attachment.mime_type ??
            "application/pdf",
        },
      );

      const uploadedFile =
        await openai.files.create({
          file,
          purpose: "user_data",
        });

      uploadedFileNames.push(
        attachment.original_name,
      );

      inputContent.push({
        type: "input_file",
        file_id: uploadedFile.id,
      });
    }

    /*
     * PDF가 있었지만 전부 다운로드/업로드에 실패했고
     * 본문도 없다면 중단
     */
    const hasUploadedPdf =
      uploadedFileNames.length > 0;

    if (!hasMeaningfulBody && !hasUploadedPdf) {
      return NextResponse.json(
        {
          error:
            "PDF 파일을 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    inputContent.push({
      type: "input_text",
      text: `
위의 게시글 본문과 첨부된 PDF 자료를 바탕으로 학습용 요약을 작성해줘.

게시글 본문은 참고 자료다.
본문이 단순한 인사, 파일 안내, 짧은 메모처럼 학습 정보가 부족하면 억지로 요약하지 말고 PDF 내용을 중심으로 정리해라.

반대로 본문에 시험 범위, 교수님 강조 내용, 출제 힌트, 작성자의 추가 설명처럼 학습에 유용한 정보가 있으면 반드시 전체 요약에 반영해라.

PDF가 여러 개라면 각 PDF의 핵심을 구분해서 정리한 뒤 전체 내용을 통합해서 정리해라.
자료에 없는 내용을 추측하거나 만들어내지 마라.
      `.trim(),
    });

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",
        instructions: `
너는 대학 강의자료를 정리하는 학습 도우미다.
반드시 제공된 게시글 본문과 첨부파일에 있는 내용만 사용해서 한국어로 작성한다.

출력 형식:

[자료별 핵심]
- PDF가 있다면 파일명을 표시하고 각 파일의 핵심 내용을 3~6개 항목으로 정리한다.
- PDF가 하나뿐이어도 파일명을 표시한다.
- PDF가 없다면 이 구역은 생략한다.

[전체 핵심 요약]
- 본문과 PDF 전체를 종합해 가장 중요한 내용을 5~8개 항목으로 정리한다.
- 중복되는 내용은 합친다.
- 본문에 유용한 시험/수업 관련 메모가 있을 때만 자연스럽게 반영한다.

[주요 개념]
- 복습할 핵심 용어 또는 개념을 간결하게 정리한다.

[한 줄 정리]
- 전체 자료의 핵심을 한 문장으로 정리한다.

불필요하게 장황하게 쓰지 않는다.
        `.trim(),
        input: [
          {
            role: "user",
            content: inputContent,
          },
        ],
      });

    const summary =
      response.output_text?.trim();

    if (!summary) {
      throw new Error(
        "AI 요약 결과가 비어 있습니다.",
      );
    }

    /* DB 캐시 저장 */
    const { error: updateError } =
      await supabaseAdmin
        .from("posts")
        .update({
          ai_summary: summary,
          ai_summary_generated_at:
            new Date().toISOString(),
        })
        .eq("id", postId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      summary,
      cached: false,
      summarizedPdfCount:
        uploadedFileNames.length,
      summarizedPdfNames:
        uploadedFileNames,
      bodyIncluded:
        hasMeaningfulBody,
    });
  } catch (error) {
    console.error(
      "AI 요약 생성 실패:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 요약을 생성하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
