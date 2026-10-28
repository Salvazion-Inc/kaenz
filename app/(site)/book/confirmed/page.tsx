"use client";

import { WithLocale } from "@/components/WithLocale";
import { BookConfirmed } from "@/components/pages/BookConfirmed";

export default function Page() {
  return <WithLocale Component={BookConfirmed} />;
}
