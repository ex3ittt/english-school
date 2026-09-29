import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default function ForgotPage() {
  return (
    <AuthShell
      kicker="Восстановление доступа"
      title={
        <>
          Забыли
          <br />
          пароль?
        </>
      }
      lead="Укажите email, на который оформлен кабинет. Мы пришлём ссылку, по ней можно задать новый пароль."
    >
      <ForgotForm />
    </AuthShell>
  );
}
