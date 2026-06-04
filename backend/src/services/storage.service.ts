import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export class StorageService {
  private client: S3Client | null = null;

  private getClient(): S3Client {
    if (!env.AWS_ACCESS_KEY_ID || !env.S3_BUCKET) {
      throw new AppError("S3 storage not configured", "STORAGE_NOT_CONFIGURED", 503);
    }
    if (!this.client) {
      this.client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
        },
      });
    }
    return this.client;
  }

  async uploadAsset(key: string, body: Buffer | string, contentType: string) {
    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async getAsset(key: string): Promise<string> {
    const client = this.getClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }),
    );
    return (await res.Body?.transformToString()) ?? "";
  }
}

export const storageService = new StorageService();
