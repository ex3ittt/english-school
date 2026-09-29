import type { Metadata } from "next";
import { logoutAction } from "@/app/(auth)/actions";
import ui from "@/components/ui.module.css";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth/guards";
import { NameForm, PasswordForm } from "./ProfileForms";
import s from "./profile.module.css";

export const metadata: Metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className={s.kicker}>Профиль</p>
        <h1 className={s.title}>{user.name}</h1>
        <p className={s.email}>{user.email}</p>
      </header>

      <div className={s.grid}>
        <section className={`paper ${s.card}`}>
          <h2 className={s.cardTitle}>Личные данные</h2>
          <NameForm name={user.name} />
          <div className={s.readonly}>
            <span className={ui.label}>Email</span>
            <p>{user.email}</p>
            <p className={ui.hint}>
              Email — это логин, его меняет школа. Напишите на {brand.supportEmail}, если адрес нужно заменить.
            </p>
          </div>
        </section>

        <section className={`paper ${s.card}`}>
          <h2 className={s.cardTitle}>Смена пароля</h2>
          <PasswordForm />
        </section>

        <section className={s.logout}>
          <p>Выйти из кабинета на этом устройстве.</p>
          <form action={logoutAction}>
            <button type="submit" className={ui.onWood}>
              Выйти
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
