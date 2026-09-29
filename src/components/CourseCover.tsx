import { LockIcon } from "@/components/icons";
import { imageUrl } from "@/lib/media";
import s from "./CourseCover.module.css";

type Props = {
  title: string;
  level: string;
  levelCode: string;
  coverKey: string | null;
  variant: number;
  locked?: boolean;
};

/** Обложка-«книга»: картинка из админки или типографская обложка по умолчанию. */
export function CourseCover({ title, level, levelCode, coverKey, variant, locked }: Props) {
  const src = imageUrl(coverKey);
  return (
    <div className={`${s.cover} ${s[`v${variant % 4}`]} ${locked ? s.locked : ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={s.img} loading="lazy" />
      ) : (
        <div className={s.type}>
          <span className={s.code}>{levelCode || "—"}</span>
          <span className={s.level}>{level}</span>
          <span className={s.title}>{title}</span>
        </div>
      )}
      {locked ? (
        <span className={s.lock} aria-label="Курс недоступен">
          <LockIcon size={16} />
        </span>
      ) : null}
    </div>
  );
}
