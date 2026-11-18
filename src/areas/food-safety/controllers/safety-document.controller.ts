// Feature F06: Food safety documents & licence verification
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  Render,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { UploadDocumentDto } from '../models/dto/upload-document.dto';
import { ReviewDocumentDto } from '../models/dto/review-document.dto';
import { QueryDocumentsDto } from '../models/dto/query-documents.dto';
import { AuthenticatedGuard } from '../../../common/guards/authenticated.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DocumentStatus, DocumentType } from '../models/food-safety-document.entity';

@Controller('safety')
export class SafetyDocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * List all submitted food safety documents with filters, search, and pagination (Feature F06)
   */
  @Get('documents')
  @Render('areas/food-safety/views/documents')
  async getDocuments(
    @Req() req: Request,
    @Query() queryDto?: QueryDocumentsDto,
    @Query('status') status?: DocumentStatus,
    @Query('type') documentType?: DocumentType,
    @Query('uploaded') uploaded?: string,
    @Query('reviewed') reviewed?: string,
    @Query('error') error?: string,
  ) {
    const user = req.session?.user;
    const qDto = queryDto || {};
    const requestedStatus = qDto.status || status;
    const requestedType = qDto.type || documentType;
    let effectiveStatus = requestedStatus || undefined;
    let effectiveManufacturerId: number | undefined = undefined;

    // RBAC Data Privacy Filtering:
    // 1. Guests and Consumers can only access approved accreditations
    if (!user || user.role === 'consumer') {
      effectiveStatus = 'approved';
    } else if (user.role === 'manufacturer') {
      // 2. Manufacturers can view all approved documents, but only their own pending/rejected items
      if (effectiveStatus && effectiveStatus !== 'approved') {
        effectiveManufacturerId = user.id;
      }
    }
    // 3. Inspectors and Admins can view all documents unconstrained

    const paginated = await this.documentService.getDocumentsPaginated({
      q: qDto.q,
      status: effectiveStatus,
      documentType: requestedType || undefined,
      manufacturerId: effectiveManufacturerId,
      page: qDto.page ? Number(qDto.page) : 1,
      limit: qDto.limit ? Number(qDto.limit) : 9,
    });
    const stats = await this.documentService.getStatistics();

    return {
      title: 'Food Safety Documents & Verified Accreditations — TrueLabel',
      activeNav: 'documents',
      documents: paginated.items,
      total: paginated.total,
      page: paginated.page,
      totalPages: paginated.totalPages,
      limit: paginated.limit,
      query: qDto.q || '',
      stats,
      currentFilter: { status: effectiveStatus || 'all', type: requestedType || 'all' },
      user,
      uploaded: uploaded === 'true',
      reviewed: reviewed === 'true',
      error: error ? decodeURIComponent(error) : null,
    };
  }

  /**
   * Render Document Submission Form (Manufacturers & Admins)
   */
  @Get('documents/upload')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('manufacturer', 'admin')
  @Render('areas/food-safety/views/upload')
  getUploadPage(@Req() req: Request) {
    return {
      title: 'Submit Food Safety Document — TrueLabel',
      activeNav: 'documents',
      user: req.session.user,
    };
  }

  /**
   * Handle Document Submission (Feature F06)
   */
  @Post('documents/upload')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('manufacturer', 'admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleUpload(
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.documentService.uploadDocument(dto, req.session.user);
      return res.redirect('/safety/documents?uploaded=true');
    } catch (err) {
      return res.render('areas/food-safety/views/upload', {
        title: 'Submit Food Safety Document — TrueLabel',
        error: err.message || 'Failed to submit document',
        formData: dto,
        user: req.session.user,
      });
    }
  }

  /**
   * Inspector / Admin Document Review (Approve or Reject with mandatory reason)
   */
  @Post('documents/:id/review')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles('inspector', 'admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDocumentDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.documentService.reviewDocument(id, dto, req.session.user);
      return res.redirect('/safety/documents?reviewed=true');
    } catch (err) {
      return res.redirect(`/safety/documents?error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Verify Manufacturer Licence against Official Registry (Feature F06)
   */
  @Get('licence/verify')
  @Render('areas/food-safety/views/verify-licence')
  async getVerifyLicencePage(
    @Query('licenceNumber') licenceNumber: string,
    @Req() req: Request,
  ) {
    let result = null;
    if (licenceNumber && licenceNumber.trim()) {
      result = await this.documentService.verifyLicence(licenceNumber);
    }
    const sampleLicences = await this.documentService.getSampleLicences(6);

    return {
      title: 'Manufacturer Licence Verification Registry — TrueLabel',
      activeNav: 'verify',
      licenceNumber: licenceNumber ? licenceNumber.trim() : '',
      result,
      sampleLicences,
      user: req.session?.user,
    };
  }
}
