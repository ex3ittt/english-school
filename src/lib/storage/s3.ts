import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "./types";

type S3Config = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

/** Любое S3-совместимое хранилище: Supabase Storage (S3 API), Cloudflare R2, AWS S3. */
export function createS3Driver(cfg: S3Config): StorageDriver {
  const client = new S3Client({
    endpoint: cfg.endpoint || undefined,
    region: cfg.region,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    // Иначе SDK добавляет в presigned PUT контрольную сумму, которую браузер не посчитает.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    async signedGetUrl(key, { ttl, fileName, contentType }) {
      const command = new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        ResponseContentDisposition: fileName
          ? `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
          : undefined,
        ResponseContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn: ttl });
    },
    async signedPutUrl(key, contentType, ttl) {
      const command = new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType });
      return getSignedUrl(client, command, { expiresIn: ttl });
    },
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    },
  };
}
