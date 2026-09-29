import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { brand } from "@/config/brand";
import { requireAdmin } from "@/lib/auth/guards";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: { default: "Админ-панель", template: `%s — Админ-панель` } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <Link href="/admin" className={s.brand}>
          <span className={s.mark}>{brand.mark}</span>
          <span>
            <strong>{brand.name}</strong>
            <small>админ-панель</small>
          </span>
        </Link>
        <AdminNav />
        <div className={s.sideFoot}>
          <span className={s.who}>{admin.name}</span>
          <Link href="/courses" className={s.sideLink}>
            Кабинет ученика
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={s.sideLink}>
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
