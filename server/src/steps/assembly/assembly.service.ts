import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../providers/storage/storage.service';
import { WsGateway } from '../../common/ws.gateway';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

@Injectable()
export class AssemblyService {
  private readonly logger = new Logger(AssemblyService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ws: WsGateway,
  ) {}

  async execute(projectId: string): Promise<void> {
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      include: {
        shots: {
          include: { video: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const episode of episodes) {
      await this.assembleEpisode(projectId, episode);
    }
  }

  private async assembleEpisode(projectId: string, episode: any): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `aicomic-${projectId}-ep${episode.episodeNumber}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // 1. 下载所有镜头视频到本地临时目录
      const videoFiles: string[] = [];
      for (let i = 0; i < episode.shots.length; i++) {
        const shot = episode.shots[i];
        if (!shot.video) {
          this.logger.warn(`Shot ${shot.id} has no video, skipping`);
          continue;
        }

        const localPath = path.join(tmpDir, `shot_${String(i).padStart(3, '0')}.mp4`);
        const response = await fetch(shot.video.videoUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(localPath, buffer);
        videoFiles.push(localPath);
      }

      if (videoFiles.length === 0) {
        throw new Error(`Episode ${episode.episodeNumber} has no video files`);
      }

      // 2. 生成字幕文件（SRT格式）
      const srtPath = path.join(tmpDir, 'subtitles.srt');
      const srtContent = this.generateSRT(episode.shots);
      fs.writeFileSync(srtPath, srtContent, 'utf-8');

      // 3. 生成FFmpeg拼接列表
      const concatListPath = path.join(tmpDir, 'concat_list.txt');
      const concatContent = videoFiles.map((f) => `file '${f}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent);

      // 4. FFmpeg拼接 + 烧录字幕
      const outputPath = path.join(tmpDir, 'final.mp4');

      await execFileAsync('ffmpeg', [
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath,
        '-vf',
        `subtitles=${srtPath}:force_style='FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`,
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-preset',
        'fast',
        '-y',
        outputPath,
      ]);

      // 5. 上传成片到存储
      const videoBuffer = fs.readFileSync(outputPath);
      const storagePath = this.storage.generatePath(projectId, 'finals', 'mp4');
      const finalUrl = await this.storage.uploadBuffer(videoBuffer, storagePath, 'video/mp4');

      // 6. 保存记录
      await this.prisma.finalVideo.create({
        data: {
          episodeId: episode.id,
          videoUrl: finalUrl,
        },
      });

      this.ws.emitToProject(projectId, 'assembly:episode:complete', {
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        videoUrl: finalUrl,
      });

      this.logger.log(`Episode ${episode.episodeNumber} assembled: ${finalUrl}`);
    } finally {
      // 清理临时文件
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * 根据分镜的对话和旁白生成SRT字幕
   */
  private generateSRT(shots: any[]): string {
    const entries: string[] = [];
    let index = 1;
    let currentTime = 0;

    for (const shot of shots) {
      const shotStart = currentTime;

      // 收集本镜头内的所有字幕条目
      const subtitleItems: { text: string }[] = [];

      const dialogues = shot.dialogue as any[] | null;
      if (dialogues) {
        for (const d of dialogues) {
          subtitleItems.push({ text: `${d.speaker}：${d.text}` });
        }
      }

      const narration = shot.narration as any | null;
      if (narration) {
        subtitleItems.push({ text: narration.text });
      }

      // 将镜头时长按字幕条目数均分
      if (subtitleItems.length > 0) {
        const sliceDuration = shot.duration / subtitleItems.length;

        for (let i = 0; i < subtitleItems.length; i++) {
          const sliceStart = shotStart + sliceDuration * i;
          const sliceEnd = shotStart + sliceDuration * (i + 1);

          entries.push(
            `${index}\n` +
              `${this.formatSRTTime(sliceStart)} --> ${this.formatSRTTime(sliceEnd)}\n` +
              `${subtitleItems[i].text}\n`,
          );
          index++;
        }
      }

      currentTime += shot.duration;
    }

    return entries.join('\n');
  }

  /**
   * 格式化时间为SRT格式：HH:MM:SS,mmm
   */
  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
}
