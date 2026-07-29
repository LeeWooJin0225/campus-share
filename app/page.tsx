import { supabase } from "@/lib/supabase";
import HomeView from "@/components/HomeView";

export default async function Home() {
  const { data: offerings, error } = await supabase
    .from("course_offerings")
    .select(`
      id,
      subject:subjects ( id, name, department ),
      professor:professors ( id, name ),
      semester:semesters ( id, year, term )
    `);

  if (error) {
    return <div className="p-10">에러: {error.message}</div>;
  }

  return <HomeView offerings={offerings ?? []} />;
}