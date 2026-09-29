import Link from "next/link";
import { brand } from "@/config/brand";
import type { SessionUser } from "@/lib/auth/session";
import s from "./TopBar.module.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function TopBar({ user }: { user: SessionUser }) {
  return (
    <header className={s.bar}>
      <Link href="/courses" className={s.brand}>
        <span className={s.mark}>{brand.mark}</span>
        <span className={s.name}>{brand.name}</span>
      </Link>
      <nav className={s.nav} aria-label="Основное меню">
        <Link href="/courses" className={s.link}>
          Мои курсы
        </Link>
        {user.role === "ADMIN" ? (
          <Link href="/admin" className={s.link}>
            Админ-панель
          </Link>
        ) : null}
        <Link href="/profile" className={s.me} title="Профиль">
          <span className={s.avatar}>{initials(user.name)}</span>
          <span className={s.meName}>{user.name.split(" ")[0]}</span>
        </Link>
      </nav>
    </header>
  );
}
