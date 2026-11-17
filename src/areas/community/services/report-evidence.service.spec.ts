import { BadRequestException } from '@nestjs/common';
import { ReportEvidenceService } from './report-evidence.service';

describe('ReportEvidenceService photo validation (F13)', () => {
  let service: ReportEvidenceService;
  beforeEach(() => { service = new ReportEvidenceService(); });

  it('allows a PNG with the correct header and MIME type', () => {
    const buffer = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
    expect(service.validatePhoto({ buffer, mimetype: 'image/png', size: buffer.length }))
      .toBe('image/png');
  });

  it('rejects a spoofed MIME type', () => {
    const buffer = Buffer.from('not actually a picture');
    expect(() => service.validatePhoto({ buffer, mimetype: 'image/png', size: buffer.length }))
      .toThrow(BadRequestException);
  });

  it('rejects files over 3 MB', () => {
    const buffer = Buffer.alloc(3 * 1024 * 1024 + 1);
    expect(() => service.validatePhoto({ buffer, mimetype: 'image/png', size: buffer.length }))
      .toThrow(BadRequestException);
  });
});
