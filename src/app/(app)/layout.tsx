import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { loadInitial } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Same request as the root layout (cached), so no extra database call
  if ((await loadInitial()) === "signed-out") redirect("/api/auth/logout");
  return <Shell>{children}</Shell>;
}
