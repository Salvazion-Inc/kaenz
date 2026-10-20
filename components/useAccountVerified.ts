"use client";

import { useEffect, useState } from "react";
import { fetchAccountAccess } from "@/lib/submit-access";

/** `null` while unknown, `false` when the signed-in account is unverified. */
export function useAccountVerified() {
  const [verified, setVerified] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    fetchAccountAccess().then((access) => {
      if (!live || !access) return;
      setVerified(access.user ? access.verified : null);
    });
    return () => {
      live = false;
    };
  }, []);
  return verified;
}
