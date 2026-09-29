import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/app/(auth)/AuthShell";
import { LoginForm } from "@/app/(auth)/LoginForm";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Вход для администратора" };

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect("/admin");
  return (
    <AuthShell
      kicker="Администрирование"
      title={
        <>
          Панель
          <br />
          школы
        </>
      }
      lead="Курсы, уроки, видео, ученики и доступ к неделям. Вход только для сотрудников с ролью администратора."
    >
      <LoginForm admin />
    </AuthShell>
  );
}
