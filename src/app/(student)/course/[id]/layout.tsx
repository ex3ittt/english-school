import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getCourseForUser } from "@/lib/student";
import { CourseNav } from "./CourseNav";
import s from "./course.module.css";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCourseForUser(user, id);
  if (!data) notFound();

  return (
    <div className={s.shell}>
      <CourseNav
        courseId={data.course.id}
        courseTitle={data.course.title}
        levelCode={data.course.levelCode}
        weeks={data.weeks.map((w) => ({
          number: w.number,
          title: w.title,
          open: w.open,
          isDone: w.isDone,
          opensAt: w.opensAt?.toISOString() ?? null,
        }))}
        curator={
          data.enrollment?.curatorName
            ? { name: data.enrollment.curatorName, schedule: data.enrollment.curatorSchedule }
            : null
        }
      />
      <div className={s.content}>{children}</div>
    </div>
  );
}
