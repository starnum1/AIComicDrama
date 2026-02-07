import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: config.get('MINIO_ENDPOINT')!,
      port: Number(config.get('MINIO_PORT')),
      useSSL: false,
      accessKey: config.get('MINIO_ACCESS_KEY')!,
      secretKey: config.get('MINIO_SECRET_KEY')!,
    });
    this.bucket = config.get('MINIO_BUCKET')!;
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  /**
   * 上传文件（从Buffer）
   */
  async uploadBuffer(buffer: Buffer, path: string, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, path, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return this.getFileUrl(path);
  }

  /**
   * 从URL下载文件并存储
   */
  async uploadFromUrl(sourceUrl: string, path: string): Promise<string> {
    const response = await fetch(sourceUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return this.uploadBuffer(buffer, path, contentType);
  }

  /**
   * 获取文件访问URL
   */
  getFileUrl(path: string): string {
    const endpoint = this.config.get('MINIO_ENDPOINT');
    const port = this.config.get('MINIO_PORT');
    return `http://${endpoint}:${port}/${this.bucket}/${path}`;
  }

  /**
   * 生成存储路径
   */
  generatePath(projectId: string, category: string, extension: string): string {
    return `projects/${projectId}/${category}/${uuid()}.${extension}`;
  }
}
