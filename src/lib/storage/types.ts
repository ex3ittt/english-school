export type SignedGet = { fileName?: string; contentType?: string; ttl: number };

export interface StorageDriver {
  /** Временная ссылка на чтение объекта. */
  signedGetUrl(key: string, opts: SignedGet): Promise<string>;
  /** Временная ссылка для загрузки прямо из браузера (минуя сервер Next.js). */
  signedPutUrl(key: string, contentType: string, ttl: number): Promise<string>;
  /** Загрузка с сервера (seed, небольшие файлы). */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}
