import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type SharedDocStorageDriver = 'local' | 's3';

export type SharedDocS3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
};

function readEnv(name: string) {
  return String(process.env[name] || '').trim();
}

function parseBool(raw: string, fallback: boolean) {
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return fallback;
}

export function getSharedDocS3Config(): SharedDocS3Config | null {
  const bucket = readEnv('SHARED_DOC_S3_BUCKET') || readEnv('S3_BUCKET');
  if (!bucket) return null;

  const endpoint = readEnv('SHARED_DOC_S3_ENDPOINT') || readEnv('S3_ENDPOINT') || undefined;
  const region =
    readEnv('SHARED_DOC_S3_REGION') ||
    readEnv('AWS_REGION') ||
    readEnv('S3_REGION') ||
    'ap-southeast-1';

  const accessKeyId =
    readEnv('SHARED_DOC_S3_ACCESS_KEY_ID') ||
    readEnv('AWS_ACCESS_KEY_ID') ||
    readEnv('S3_ACCESS_KEY_ID') ||
    undefined;

  const secretAccessKey =
    readEnv('SHARED_DOC_S3_SECRET_ACCESS_KEY') ||
    readEnv('AWS_SECRET_ACCESS_KEY') ||
    readEnv('S3_SECRET_ACCESS_KEY') ||
    undefined;

  const forcePathStyle = parseBool(readEnv('SHARED_DOC_S3_FORCE_PATH_STYLE'), Boolean(endpoint));

  return {
    bucket,
    region,
    endpoint,
    forcePathStyle,
    accessKeyId,
    secretAccessKey,
  };
}

export function getSharedDocStorageDriver(): SharedDocStorageDriver {
  const raw = readEnv('SHARED_DOC_STORAGE_DRIVER').toLowerCase();
  if (raw === 'local' || raw === 's3') return raw;
  return getSharedDocS3Config() ? 's3' : 'local';
}

export function createSharedDocS3Client(config: SharedDocS3Config) {
  const credentials =
    config.accessKeyId && config.secretAccessKey
      ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        }
      : undefined;

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials,
  });
}

export function toSharedDocS3Path(bucket: string, objectKey: string) {
  return `s3://${bucket}/${objectKey.replace(/^\/+/, '')}`;
}

export function parseSharedDocS3Path(filePath: string) {
  const raw = String(filePath || '').trim();
  if (!raw.startsWith('s3://')) return null;
  const rest = raw.slice('s3://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  const key = rest.slice(slash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
}

export async function uploadSharedDocToS3(input: {
  objectKey: string;
  content: Buffer;
  contentType: string | null;
}) {
  const cfg = getSharedDocS3Config();
  if (!cfg) {
    throw new Error('S3 config missing: set SHARED_DOC_S3_BUCKET and related credentials.');
  }

  const client = createSharedDocS3Client(cfg);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: input.objectKey,
      Body: input.content,
      ContentType: input.contentType || 'application/octet-stream',
    })
  );

  return toSharedDocS3Path(cfg.bucket, input.objectKey);
}

export async function signSharedDocS3DownloadUrl(input: {
  filePath: string;
  contentType?: string | null;
  originalFileName: string;
  download: boolean;
  expiresInSeconds?: number;
}) {
  const parsed = parseSharedDocS3Path(input.filePath);
  if (!parsed) return null;

  const cfg = getSharedDocS3Config();
  if (!cfg) return null;

  const client = createSharedDocS3Client(cfg);
  const cmd = new GetObjectCommand({
    Bucket: parsed.bucket,
    Key: parsed.key,
    ResponseContentType: input.contentType || undefined,
    ResponseContentDisposition: input.download
      ? `attachment; filename*=UTF-8''${encodeURIComponent(input.originalFileName)}`
      : undefined,
  });

  const url = await getSignedUrl(client, cmd, { expiresIn: input.expiresInSeconds ?? 300 });
  return url;
}
