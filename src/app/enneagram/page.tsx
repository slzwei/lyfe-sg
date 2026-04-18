import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { getAdminClient } from "@/lib/supabase/admin";
import EnneagramQuiz from "./EnneagramQuiz";
import type { QuizQuestion, EnneagramType } from "./scoring";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Enneagram Quiz",
  description: "A 36-question Enneagram personality reading.",
};

export const dynamic = "force-dynamic";

export default async function EnneagramQuizPage() {
  const supabase = getAdminClient();

  const { data: paper, error: paperErr } = await supabase
    .from("exam_papers")
    .select("id")
    .eq("code", "ENNEAGRAM_SAMPLER")
    .single();

  if (paperErr || !paper) {
    return (
      <div className={`${cormorant.variable} ${jetbrains.variable} min-h-screen bg-[#F5EFE2] px-6 py-16 text-center`}>
        <h1 className="text-2xl font-bold text-stone-800">Quiz unavailable</h1>
        <p className="mt-2 text-stone-500">The Enneagram reading could not be loaded.</p>
      </div>
    );
  }

  const { data: rows, error: questionsErr } = await supabase
    .from("exam_questions")
    .select("question_number, options, explanation")
    .eq("paper_id", paper.id)
    .order("question_number");

  if (questionsErr || !rows || rows.length === 0) {
    return (
      <div className={`${cormorant.variable} ${jetbrains.variable} min-h-screen bg-[#F5EFE2] px-6 py-16 text-center`}>
        <h1 className="text-2xl font-bold text-stone-800">Quiz unavailable</h1>
        <p className="mt-2 text-stone-500">No questions found.</p>
      </div>
    );
  }

  const questions: QuizQuestion[] = rows
    .map((row) => {
      const opts = row.options as { A?: string; B?: string } | null;
      let typeA: EnneagramType = 1;
      let typeB: EnneagramType = 1;
      try {
        const explanation =
          typeof row.explanation === "string"
            ? JSON.parse(row.explanation)
            : row.explanation;
        if (explanation?.quiz_type === "enneagram" && explanation.types) {
          typeA = Number(explanation.types.A) as EnneagramType;
          typeB = Number(explanation.types.B) as EnneagramType;
        }
      } catch {
        // fall through
      }
      return {
        question_number: row.question_number,
        optionA: opts?.A ?? "",
        optionB: opts?.B ?? "",
        typeA,
        typeB,
      };
    })
    .filter((q) => q.optionA && q.optionB);

  return (
    <div className={`${cormorant.variable} ${jetbrains.variable}`}>
      <EnneagramQuiz questions={questions} />
    </div>
  );
}
