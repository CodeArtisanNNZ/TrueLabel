// Feature F06: Food safety documents & licence verification
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentType } from '../food-safety-document.entity';

export class QueryDocumentsDto {
  @IsOptional()
  @IsString()
  q?: string; // Query matching companyName, certificateNumber, or issuer

  @IsOptional()
  @IsString()
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  type?: DocumentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 9;
}
