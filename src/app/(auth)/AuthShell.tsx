import Link from "next/link";
import { brand } from "@/config/brand";
import s from "./auth.module.css";

type Props = {
  kicker: string;
  title: React.ReactNode;
  lead: string;
  children: React.ReactNode;
};

export function AuthShell({ kicker, title, lead, children }: Props) {
  return (
    <main className={s.page}>
      <section className={s.side}>
        <Link href="/login" className={s.brand}>
          <span className={s.mark}>{brand.mark}</span>
          <span className={s.brandName}>
            <strong>{brand.name}</strong>
            <span>{brand.tagline}</span>
          </span>
        </Link>
        <div className={s.intro}>
          <span className={s.kicker}>{kicker}</span>
          <h1 className={s.title}>{title}</h1>
          <p className={s.lead}>{lead}</p>
        </div>
        <div className={s.deco} aria-hidden="true">
          <span>A1 A2 B1 B2</span>
        </div>
        <p className={s.foot}>
          {brand.supportText} <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
        </p>
      </section>
      <div className={s.formWrap}>{children}</div>
    </main>
  );
}
