import type { Metadata } from "next";
import Link from "next/link";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { relativeDays, STALE_DAYS } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Ученики" };

type Props = { searchParams: Promise<{ q?: string; filter?: string }> };

export default async function StudentsPage({ searchParams }: Props) {
  await requireAdmin();
  const { q = "", filter = "all" } = await searchParams;
  const weekAgo = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const where: Prisma.UserWhereInput = { role: "STUDENT" };
  if (q.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: "insensitive" } },
      { email: { contains: q.trim(), mode: "insensitive" } },
    ];
  }
  if (filter === "blocked") where.isBlocked = true;
  if (filter === "stale") where.AND = [{ isBlocked: false }, { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: weekAgo } }] }];

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      isBlocked: true,
      lastSeenAt: true,
      _count: { select: { progress: true } },
      enrollments: {
        select: {
          curatorName: true,
          course: { select: { title: true, weeks: { select: { days: { select: { _count: { select: { lessons: true } } } } } } } },
        },
      },
    },
  });

  const FILTERS = [
    { key: "all", label: "Все" },
    { key: "stale", label: "Давно не заходили" },
    { key: "blocked", label: "Заблокированные" },
  ];

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <h1 className={s.title}>Ученики</h1>
          <p className={s.subtitle}>Аккаунты создаёт только школа: у учеников нет самостоятельной регистрации.</p>
        </div>
        <Link href="/admin/students/new" className={ui.primary}>
          Новый ученик
        </Link>
      </header>

      <section className={`paper ${s.panel}`}>
        <form className={s.toolbar} role="search">
          <input
            className={`${ui.input} ${s.search}`}
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Имя или email"
            aria-label="Поиск ученика"
          />
          <input type="hidden" name="filter" value={filter} />
          <button type="submit" className={ui.secondary}>
            Найти
          </button>
          <div className={s.actions} style={{ marginLeft: "auto" }}>
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/admin/students?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={f.key === filter ? s.badgeRed : s.badgeOutline}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </form>

        {users.length === 0 ? (
          <p className={s.empty}>Никого не нашли.</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Курсы</th>
                  <th>Куратор</th>
                  <th>Уроков пройдено</th>
                  <th>Заходил</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const total = u.enrollments.reduce(
                    (sum, e) => sum + e.course.weeks.reduce((a, w) => a + w.days.reduce((b, d) => b + d._count.lessons, 0), 0),
                    0,
                  );
                  const stale = !u.lastSeenAt || u.lastSeenAt < weekAgo;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={s.cellMain}>
                          <Link href={`/admin/students/${u.id}`}>{u.name}</Link>
                          <span className={s.cellSub}>{u.email}</span>
                        </div>
                      </td>
                      <td>{u.enrollments.map((e) => e.course.title).join(", ") || <span className={s.muted}>—</span>}</td>
                      <td>{u.enrollments.map((e) => e.curatorName).filter(Boolean).join(", ") || <span className={s.muted}>—</span>}</td>
                      <td className={s.num}>
                        <span className={s.miniBar}>
                          <span style={{ width: `${total ? Math.min(100, (u._count.progress / total) * 100) : 0}%` }} />
                        </span>
                        {u._count.progress} из {total}
                      </td>
                      <td className={s.num} style={stale ? { color: "var(--red)" } : undefined}>
                        {relativeDays(u.lastSeenAt)}
                      </td>
                      <td>{u.isBlocked ? <span className={s.badgeRed}>Заблокирован</span> : <span className={s.badge}>Активен</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
