"use client";

import { HomePage } from "./HomePage";
import { WithLocale } from "./WithLocale";

export function HomeClient() {
  return <WithLocale Component={HomePage} />;
}
