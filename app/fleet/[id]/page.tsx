import { YachtDetailClient } from "@/components/pages/YachtDetailClient";
import { resolveInventoryYacht } from "@/lib/inventory";
import { yachts } from "@/lib/yachts";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return yachts.map((y) => ({ id: y.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const yacht = await resolveInventoryYacht(id);
  if (!yacht) notFound();
  return <YachtDetailClient yacht={yacht} />;
}
