import StudentDetailPage from "../page";

export default async function StudentCoordinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; [key: string]: string | undefined }>;
}) {
  const route = await params;
  const sp = await searchParams;

  return StudentDetailPage({
    params: Promise.resolve(route),
    searchParams: Promise.resolve({
      ...(sp ?? {}),
      focus: "scheduling-coordination",
    }),
  });
}
