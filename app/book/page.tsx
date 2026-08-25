"use client";

import { WithLocale } from "@/components/WithLocale";
import { BookPage } from "@/components/pages/BookPage";

export default function Page() {
  return <WithLocale Component={BookPage} />;
}
