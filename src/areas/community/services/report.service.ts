import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FoodProduct } from '../../food-catalog/models/food-product.entity';
import { FoodReport, ReportStatus } from '../models/food-report.entity';
import { ReportEvidence } from '../models/report-evidence.entity';
import { CreateReportDto } from '../models/dto/create-report.dto';
import { EvidenceUpload, ReportEvidenceService } from './report-evidence.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(FoodReport)
    private readonly reportRepo: Repository<FoodReport>,
    @InjectRepository(FoodProduct)
    private readonly productRepo: Repository<FoodProduct>,
    @InjectRepository(ReportEvidence)
    private readonly evidenceRepo: Repository<ReportEvidence>,
    private readonly evidenceStorage: ReportEvidenceService,
  ) {}

  async getProduct(productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId, status: 'active' },
    });
    if (!product) throw new NotFoundException('Food product not found');
    return product;
  }

  // F13: The reference is issued even if no photo is attached.
  async create(productId: number, userId: number, dto: CreateReportDto, photo?: EvidenceUpload) {
    await this.getProduct(productId);
    if (!dto.description?.trim() || dto.description.trim().length < 20) {
      throw new BadRequestException('Please explain the problem in more detail');
    }
    if (!dto.purchasePlace?.trim() || dto.purchasePlace.trim().length < 2) {
      throw new BadRequestException('Purchase location is required');
    }

    const referenceNumber = 'TL-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' + randomUUID().slice(0, 8).toUpperCase();
    const report = this.reportRepo.create({
      productId, userId, category: dto.category,
      batchCode: dto.batchCode?.trim() || null,
      purchasePlace: dto.purchasePlace.trim(),
      description: dto.description.trim(),
      referenceNumber, status: 'pending',
    });

    if (!photo) return this.reportRepo.save(report);

    const mimeType = this.evidenceStorage.validatePhoto(photo);
    const extension = mimeType === 'image/png' ? 'png' :
      mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = 'reports/' + randomUUID() + '.' + extension;
    // Upload first, then remove the private file if writing to the DB fails.
    await this.evidenceStorage.upload(path, photo, mimeType);
    try {
      const saved = await this.reportRepo.save(report);
      const evidence = this.evidenceRepo.create({
        reportId: saved.id, filePath: path,
        mimeType, byteSize: photo.size,
      });
      await this.evidenceRepo.save(evidence);
      return saved;
    } catch (error) {
      await this.evidenceStorage.remove(path).catch(() => undefined);
      throw error;
    }
  }

  async forConsumer(userId: number) {
    return this.reportRepo.find({
      where: { userId }, relations: ['product', 'evidence'],
      order: { createdAt: 'DESC' },
    });
  }

  // Staff can group complaints about the same product and batch code.
  async queue() {
    const reports = await this.reportRepo.find({
      relations: ['product', 'author', 'evidence'],
      order: { createdAt: 'DESC' },
    });
    return reports.map((report) => ({
      ...report,
      linkedCount: report.batchCode
        ? reports.filter((candidate) =>
            candidate.productId === report.productId &&
            candidate.batchCode === report.batchCode).length : 1,
    }));
  }

  // Private evidence requires either the reporter or inspector/admin role.
  async evidenceUrl(reportId: number, user: { id: number; role: string }) {
    const report = await this.reportRepo.findOne({
      where: { id: reportId }, relations: ['evidence'],
    });
    if (!report) throw new NotFoundException('Complaint not found');
    const staff = user.role === 'inspector' || user.role === 'admin';
    if (!staff && report.userId !== user.id) {
      throw new ForbiddenException('This photo does not belong to you');
    }
    const evidence = report.evidence?.[0];
    if (!evidence) throw new NotFoundException('Photo evidence not found');
    return this.evidenceStorage.signedUrl(evidence.filePath);
  }

  // F14 will implement the full audited investigation state machine.
  async updateStatus(id: number, status: Exclude<ReportStatus, 'pending'>, role: string) {
    if (role !== 'inspector' && role !== 'admin') {
      throw new ForbiddenException('Only inspectors or admins may update reports');
    }
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Complaint not found');
    report.status = status;
    return this.reportRepo.save(report);
  }
}
