import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

interface AttemptRecord {
  timestamps: number[];
}

@Injectable()
export class AuthThrottlerGuard implements CanActivate {
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60 * 1000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown-ip';

    const now = Date.now();
    const record = this.attempts.get(clientIp) || { timestamps: [] };

    // Filter out timestamps outside the active window
    record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);

    if (record.timestamps.length >= this.maxAttempts) {
      throw new HttpException(
        'Too many authentication requests from this IP. Please wait 1 minute before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    this.attempts.set(clientIp, record);

    return true;
  }
}
