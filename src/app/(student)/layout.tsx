import { requireUser } from "@/lib/auth/guards";
import { TopBar } from "@/components/TopBar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <TopBar user={user} />
      {children}
    </>
  );
}
