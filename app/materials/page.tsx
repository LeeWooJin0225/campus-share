import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MaterialsView from "@/components/MaterialsView";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: { subject?: string };
}) {
  const subjectName = searchParams.subject;

  if (!subjectName) {
    return <NotFoundState />;
  }

  const { data: subject, error } = await supabase
  .from("subjects")
  .select("id, name, department")
  .eq("name", subjectName)
  .maybeSingle();
  
  if (error || !subject) {
    return <NotFoundState />;
  }

  return <MaterialsView subject={subject} />;
}

function NotFoundState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-white px-8 py-20 text-center">
      <p className="text-lg font-semibold text-[#37352F]">과목을 찾을 수 없어요</p>
      <p className="text-sm text-[#8E8C86]">
        주소가 정확한지 확인하거나, 홈에서 과목을 다시 선택해주세요.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[#7F77DD] px-4 py-2 text-sm font-medium text-white hover:bg-[#6B63CE]"
      >
        홈으로 가기
      </Link>
    </div>
  );
}