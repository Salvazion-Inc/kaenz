import { Suspense } from "react";
import { CheckEmailPage } from "@/components/CheckEmailPage";

export const metadata = { title: "Check your email | Kaenz" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : "";
  return (
    <Suspense>
      <CheckEmailPage email={address} />
    </Suspense>
  );
}
