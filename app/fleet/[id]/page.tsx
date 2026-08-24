import { YachtDetail } from "@/components/pages/YachtDetail";
import { yachts } from "@/lib/yachts";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return yachts.map((y) => ({ id: y.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const yacht = yachts.find((y) => y.id === id);
  if (!yacht) notFound();
  return <YachtDetail locale="en" yacht={yacht} />;
}
