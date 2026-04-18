import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
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

type RpcRow = {
  question_number: number;
  options: { A?: string; B?: string } | null;
  explanation: string | null;
};

export default async function EnneagramQuizPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("get_enneagram_sampler_questions");

  if (error || !rows || rows.length === 0) {
    return (
      <div
        className={`${cormorant.variable} ${jetbrains.variable} min-h-screen bg-[#F5EFE2] px-6 py-16 text-center`}
      >
        <h1 className="text-2xl font-bold text-stone-800">Quiz unavailable</h1>
        <p className="mt-2 text-stone-500">The Enneagram reading could not be loaded.</p>
      </div>
    );
  }

  const questions: QuizQuestion[] = (rows as RpcRow[])
    .map((row) => {
      const opts = row.options;
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
