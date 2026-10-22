import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Reset your password | Kaenz" };

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
