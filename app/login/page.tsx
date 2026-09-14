import AuthForm from "@/components/AuthForm";
import { configured } from "@/lib/app-config";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <>
      {p.error && (
        <p className="notice">
          That confirmation link could not be verified. Sign in or request a new
          reset link.
        </p>
      )}
      <AuthForm mode="login" enabled={configured()} />
    </>
  );
}
