import type { Metadata } from "next";
import Link from "next/link";
import s from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { NewStudentForm } from "./NewStudentForm";

export const metadata: Metadata = { title: "Новый ученик" };

export default async function NewStudentPage() {
  await requireAdmin();
  const courses = await db.course.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true, isMain: true } });
  return (
    <>
      <header className={s.pageHead}>
        <div>
          <nav className={s.crumbs}>
            <Link href="/admin/students">Ученики</Link> /
          </nav>
          <h1 className={s.title}>Новый ученик</h1>
          <p className={s.subtitle}>После создания покажем пароль — его нужно передать ученику.</p>
        </div>
      </header>
      <NewStudentForm courses={courses} />
    </>
  );
}
