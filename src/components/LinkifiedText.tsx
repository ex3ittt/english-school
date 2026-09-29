const URL_RE = /(https?:\/\/[^\s<>"«»]+[^\s<>"«».,;:!?)\]])/g;

/**
 * Текст из админки как есть (без HTML), но ссылки http(s) кликабельны.
 * Безопасно: React экранирует текст, в href попадают только http/https.
 */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
