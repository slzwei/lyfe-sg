import PipelineClient from "./PipelineClient";

export default async function JobPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PipelineClient jobId={id} />;
}
