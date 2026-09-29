import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "../LoginForm";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/courses");
  const { next } = await searchParams;

  return (
    <AuthShell
      kicker="Личный кабинет"
      title={
        <>
          Уроки, домашка
          <br />и прогресс —
          <br />в одном месте
        </>
      }
      lead="Аккаунт создаёт школа после оплаты. Регистрироваться не нужно: логин и пароль придут от куратора."
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
