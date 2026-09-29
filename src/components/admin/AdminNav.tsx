"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./admin.module.css";

const ITEMS = [
  { href: "/admin", label: "Обзор", exact: true },
  { href: "/admin/students", label: "Ученики" },
  { href: "/admin/courses", label: "Курсы и уроки" },
  { href: "/admin/teachers", label: "Преподаватели" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={s.nav} aria-label="Разделы админ-панели">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) || (item.href === "/admin/courses" && pathname.startsWith("/admin/lessons"));
        return (
          <Link key={item.href} href={item.href} className={`${s.navItem} ${active ? s.navActive : ""}`} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
