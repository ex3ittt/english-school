import Link from "next/link";
import ui from "@/components/ui.module.css";
import s from "./status.module.css";

export default function NotFound() {
  return (
    <main className={s.page}>
      <div className={`paper ${s.sheet}`}>
        <span className={s.code}>404</span>
        <h1 className={s.title}>Такой страницы нет</h1>
        <p className={s.text}>
          Возможно, ссылка устарела или курс вам пока недоступен. Проверьте адрес или вернитесь к своим курсам.
        </p>
        <Link href="/courses" className={ui.primary}>
          К моим курсам
        </Link>
      </div>
    </main>
  );
}
