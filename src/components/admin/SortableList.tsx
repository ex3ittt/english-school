"use client";

import { useEffect, useState, useTransition } from "react";
import { GripIcon } from "@/components/icons";
import s from "./SortableList.module.css";

type Item = { id: string; node: React.ReactNode };

/**
 * Список с перетаскиванием за «ручку». Кнопки ↑/↓ дублируют перетаскивание
 * для клавиатуры и телефонов. Порядок сразу сохраняется через onReorder.
 */
export function SortableList({
  items,
  onReorder,
  label = "Порядок",
}: {
  items: Item[];
  onReorder: (ids: string[]) => Promise<void>;
  label?: string;
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // draggable включаем только пока зажата «ручка», иначе ломается выделение текста в полях.
  const [armedId, setArmedId] = useState<string | null>(null);

  // Новые элементы с сервера (добавили/удалили) — пересобираем порядок.
  const signature = items.map((i) => i.id).join(",");
  useEffect(() => setOrder(signature ? signature.split(",") : []), [signature]);

  const byId = new Map(items.map((i) => [i.id, i]));

  function commit(next: string[]) {
    setOrder(next);
    start(() => onReorder(next));
  }

  function move(id: string, delta: number) {
    const from = order.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    commit(next);
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((x) => x !== dragId);
    next.splice(next.indexOf(targetId) + (order.indexOf(dragId) < order.indexOf(targetId) ? 1 : 0), 0, dragId);
    commit(next);
  }

  return (
    <ol className={`${s.list} ${pending ? s.saving : ""}`} aria-label={label}>
      {order.map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <li
            key={id}
            className={`${s.item} ${dragId === id ? s.dragging : ""} ${overId === id && dragId !== id ? s.over : ""}`}
            draggable={armedId === id}
            onDragStart={(e) => {
              setDragId(id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverId(id);
            }}
            onDragLeave={() => setOverId((v) => (v === id ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              drop(id);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
              setArmedId(null);
            }}
          >
            <span
              className={s.handle}
              title="Перетащите, чтобы изменить порядок"
              onMouseDown={() => setArmedId(id)}
              onMouseUp={() => setArmedId(null)}
            >
              <GripIcon size={18} />
            </span>
            <div className={s.body}>{item.node}</div>
            <span className={s.arrows}>
              <button type="button" onClick={() => move(id, -1)} disabled={index === 0} aria-label="Выше">
                ↑
              </button>
              <button type="button" onClick={() => move(id, 1)} disabled={index === order.length - 1} aria-label="Ниже">
                ↓
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
