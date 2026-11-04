import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { ResetPasswordWho } from "@/components/ResetPasswordWho";

export const metadata = { title: "Choose a new password | Kaenz" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordWho />
      <ResetPasswordForm />
    </Suspense>
  );
}
