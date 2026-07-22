import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, professor, semester");

  if (error) {
    return <div>에러: {error.message}</div>;
  }

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">📚 강의 목록</h1>

      {!subjects || subjects.length === 0 ? (
        <p>등록된 강의가 없습니다.</p>
      ) : (
        subjects.map((subject) => (
          <div
            key={subject.id}
            className="mb-4 rounded-lg border p-4 shadow"
          >
            <h2 className="text-xl font-semibold">{subject.name}</h2>
            <p>교수: {subject.professor}</p>
            <p>학기: {subject.semester}</p>
          </div>
        ))
      )}
    </main>
  );
}