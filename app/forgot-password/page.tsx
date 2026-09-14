import AuthForm from "@/components/AuthForm";
import { configured } from "@/lib/app-config";
export const dynamic = "force-dynamic";
export default function Forgot() {
  return <AuthForm mode="reset" enabled={configured()} />;
}
