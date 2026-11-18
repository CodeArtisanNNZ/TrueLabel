import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateIngredientDto {
  @IsNotEmpty({ message: 'Ingredient name is required' })
  @IsString()
  name: string;

  @IsOptional()
  isAllergen?: boolean;

  @IsOptional()
  @IsString()
  allergenType?: string;

  @IsOptional()
  @IsString()
  additiveCode?: string;

  @IsOptional()
  @IsString()
  hazardLevel?: 'safe' | 'caution' | 'warning';
}

export class CreateNutritionFactDto {
  @IsNotEmpty({ message: 'Nutrient name is required' })
  @IsString()
  nutrient: string;

  @IsNotEmpty({ message: 'Amount per 100g is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount per 100g must be a valid number' })
  amountPer100g: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount per serving must be a valid number' })
  amountPerServing?: number;

  @IsNotEmpty({ message: 'Unit is required' })
  @IsString()
  unit: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Daily value percentage must be a valid number' })
  dailyValuePercentage?: number;
}

export class CreateFoodProductDto {
  @IsNotEmpty({ message: 'Food product name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Brand name is required' })
  @IsString()
  brand: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  category: string;

  @IsNotEmpty({ message: 'Barcode is required' })
  @IsString()
  barcode: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Serving size must be a valid number' })
  servingSize?: number;

  @IsOptional()
  @IsString()
  servingUnit?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray({ message: 'Dietary tags must be an array of strings' })
  dietaryTags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIngredientDto)
  ingredients?: CreateIngredientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNutritionFactDto)
  nutritionFacts?: CreateNutritionFactDto[];
}

