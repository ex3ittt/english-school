import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Новый пароль" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      kicker="Восстановление доступа"
      title={
        <>
          Придумайте
          <br />
          новый пароль
        </>
      }
      lead="Не короче 8 символов. После смены пароля мы выйдем из кабинета на всех устройствах."
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}
