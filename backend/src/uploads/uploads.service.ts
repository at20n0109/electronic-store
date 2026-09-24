import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { CreateImageUploadDto } from './dto/create-image-upload.dto.js';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly acl: string | undefined;
  private readonly signedTtl = 900;

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

  async createImagePresigned(dto: CreateImageUploadDto) {
    if (!ALLOWED_IMAGE_TYPES.has(dto.mimeType)) {
      throw new Error('Unsupported image type');
    }

    const ext = extname(dto.filename) || `.${dto.mimeType.split('/')[1]}`;
    const key = `uploads/${randomUUID()}${ext.toLowerCase()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.mimeType,
      ...this.aclParam(),
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.signedTtl,
    });

    return { key, uploadUrl, url: this.public(key) };
  }

  async getPresignedDownload(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.s3, command, {
      expiresIn: this.signedTtl,
    });
    return { key, url };
  }

  publicUrl(key: string): string {
    return this.public(key);
  }

  async uploadBuffer(
    body: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...this.aclParam(),
      }),
    );
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
