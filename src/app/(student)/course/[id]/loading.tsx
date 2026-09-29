import s from "./loading.module.css";

export default function Loading() {
  return (
    <div className={s.wrap} aria-busy="true" aria-label="Загрузка">
      <span className={s.line} style={{ width: "22%" }} />
      <span className={s.title} />
      <span className={`paper ${s.sheet}`} />
    </div>
  );
}
