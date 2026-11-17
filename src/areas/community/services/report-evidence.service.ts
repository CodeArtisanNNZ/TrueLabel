import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface EvidenceUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const BUCKET = 'report-evidence'; // Must be created as a PRIVATE Supabase Storage bucket.
const MAX_SIZE = 3 * 1024 * 1024;

@Injectable()
export class ReportEvidenceService {
  private client: SupabaseClient | null = null;

  private getClient() {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    // Never use an anon key for server-managed private complaint evidence.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new ServiceUnavailableException('Private photo evidence storage is not configured');
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  // F13: Reject oversized, spoofed, or unsupported image uploads.
  validatePhoto(photo: EvidenceUpload) {
    if (!photo || !photo.buffer || !photo.size || photo.size > MAX_SIZE) {
      throw new BadRequestException('Photo must be smaller than 3 MB');
    }
    const buf = photo.buffer;
    const jpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const png = buf.length >= 8 && buf.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    const webp = buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP';
    const detected = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : null;
    if (!detected || photo.mimetype !== detected) {
      throw new BadRequestException('Only JPEG, PNG or WebP photos are supported');
    }
    return detected;
  }

  async upload(path: string, photo: EvidenceUpload, contentType: string) {
    const { error } = await this.getClient().storage.from(BUCKET).upload(path, photo.buffer, {
      contentType, upsert: false,
    });
    if (error) throw new ServiceUnavailableException('Unable to save private photo evidence');
  }

  async remove(path: string) {
    await this.getClient().storage.from(BUCKET).remove([path]);
  }

  async signedUrl(path: string) {
    const { data, error } = await this.getClient().storage.from(BUCKET)
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException('Unable to open photo evidence');
    }
    return data.signedUrl;
  }
}
