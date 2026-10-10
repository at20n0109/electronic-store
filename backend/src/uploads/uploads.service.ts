import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

/**
 * Decoded image ceiling. The request body carries the raw bytes, so this is
 * also what the request-stream reader enforces before anything is buffered.
 */
const MAX_IMAGE_BYTES = 2500000;

/** `uploads/<uuid>.<ext>` — generated server-side, so only this shape is served. */
const IMAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|webp|avif)$/i;

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly acl: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicBase =
      config.get<string>('S3_PUBLIC_URL') ??
      config.get<string>('S3_ENDPOINT') ??
      '';
    this.acl = config.get<string>('S3_ACL') || undefined;
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  private aclParam(): { ACL?: ObjectCannedACL } {
    return this.acl ? { ACL: this.acl as ObjectCannedACL } : {};
  }

  private async put(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...this.aclParam(),
      }),
    );
  }

  /**
   * Stores an admin-uploaded image sent as raw request bytes.
   *
   * The bytes arrive as the request body rather than as a JSON field on
   * purpose: body-parser skips content types it does not recognise, so an image
   * never gets clipped by Nest's 100kb JSON default, and the payload carries no
   * base64 overhead. The caller is already validated by the RolesGuard, so this
   * method only has to police the payload itself.
   */
  async uploadImage(req: Request): Promise<{ id: string }> {
    const contentType = normalizeContentType(req.headers['content-type']);
    if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new BadRequestException('Unsupported image type');
    }

    const body = await readCappedBody(req, MAX_IMAGE_BYTES);

    // Derived from the validated content type, not from anything the client
    // names the file, so the extension can never disagree with the bytes.
    const ext = `.${contentType.split('/')[1]}`;
    const id = `${randomUUID()}${ext}`;
    await this.put(`uploads/${id}`, body, contentType);
    return { id };
  }

  async readImage(id: string): Promise<{
    body: Buffer;
    contentType: string | null;
  }> {
    // The key is reconstructed here, never taken from the request, so a
    // traversal attempt fails at the pattern check before touching the bucket.
    if (!IMAGE_ID_PATTERN.test(id)) {
      throw new BadRequestException('Invalid image id');
    }

    let response;
    try {
      response = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: `uploads/${id}` }),
      );
    } catch {
      // R2 signals a missing object by throwing, so a typo'd or purged id is a
      // 404 rather than an unhandled error.
      throw new NotFoundException('Image not found');
    }
    if (!response.Body) {
      throw new NotFoundException('Image not found');
    }

    return {
      body: Buffer.from(await response.Body.transformToByteArray()),
      contentType: response.ContentType ?? null,
    };
  }

  publicUrl(key: string): string {
    return this.public(key);
  }

  async uploadBuffer(
    body: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.put(key, body, contentType);
    return this.public(key);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.s3.send(command);
    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }

  private public(key: string): string {
    const base = this.publicBase || '';
    return base ? `${base.replace(/\/+$/, '')}/${this.bucket}/${key}` : key;
  }
}

/** Strips any `;charset=...` parameter and lowercases the media type. */
function normalizeContentType(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return '';
  return value.split(';')[0].trim().toLowerCase();
}

/**
 * Buffers a request body while counting, so an oversized upload is rejected as
 * soon as the limit is crossed instead of after the whole body has been held
 * in memory.
 */
async function readCappedBody(
  req: Request,
  limit: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) {
      throw new BadRequestException('Image is too large');
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks);
  if (body.length === 0) {
    throw new BadRequestException('Image payload is empty');
  }
  return body;
}
