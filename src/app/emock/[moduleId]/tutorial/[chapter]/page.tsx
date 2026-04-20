import { notFound } from "next/navigation";
import {
  isValidModuleId,
  isValidChapterKey,
  getChaptersForModule,
  getTutorialQuestions,
  UNCATEGORISED_KEY,
} from "@/lib/quiz";
import { getChapterProgress } from "../actions";
import TutorialClient from "./TutorialClient";

export default async function TutorialChapterPage({
  params,
}: {
  params: Promise<{ moduleId: string; chapter: string }>;
}) {
  const { moduleId, chapter } = await params;
  if (!isValidModuleId(moduleId)) notFound();
  if (!isValidChapterKey(moduleId, chapter)) notFound();

  const items = getTutorialQuestions(moduleId, chapter);
  if (items.length === 0) notFound();

  const chapterMeta = getChaptersForModule(moduleId).find(
    (c) => c.key === chapter
  )!;
  const progress = await getChapterProgress(moduleId, chapter);

  return (
    <TutorialClient
      moduleId={moduleId}
      chapterKey={chapter}
      chapterLabel={chapterMeta.label}
      isUncategorised={chapter === UNCATEGORISED_KEY}
      items={items}
      initialProgress={progress}
    />
  );
}
