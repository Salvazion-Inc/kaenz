"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

/** Security notice: whose password is being changed, with a way out. */
export function ResetPasswordWho() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEmail(String(d?.user?.email || ""));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!email) return null;
  return (
    <p className="mx-auto mt-6 max-w-md px-4 text-center text-sm">
      Estás cambiando la contraseña de <strong>{email}</strong>{" "}
      <LogoutButton label="No soy yo" className="underline" />
    </p>
  );
}
