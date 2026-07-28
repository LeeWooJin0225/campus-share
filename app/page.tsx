import { supabase } from "@/lib/supabase";
import HomeView from "@/components/HomeView";

export default async function Home() {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, professor, semester");

  if (error) {
    return <div className="p-10">에러: {error.message}</div>;
  }

  return <HomeView subjects={subjects ?? []} />;
}