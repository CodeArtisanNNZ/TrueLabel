// Feature F16: Food Preference & Allergen Profile
import {
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GenderType, ActivityLevel } from '../preference-profile.entity';

// Helper to safely transform empty string form values to null
const toNullableNumber = ({ value }: { value: any }) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? value : num;
};

export class UpdatePreferenceProfileDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
  })
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
  })
  @IsArray()
  @IsString({ each: true })
  dietaryPreferences?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    let items: string[] = [];
    if (Array.isArray(value)) {
      items = value.map((s: string) => String(s).trim()).filter(Boolean);
    } else if (typeof value === 'string') {
      items = value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    // Case-insensitive deduplication
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const item of items) {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(item);
      }
    }
    return unique;
  })
  @IsArray()
  @IsString({ each: true })
  dislikedIngredients?: string[];

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(500)
  @Max(10000)
  calorieGoal?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0)
  @Max(500)
  maxSugarPerServing?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0)
  @Max(10000)
  maxSodiumPerServing?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0)
  @Max(200)
  minProteinPerServing?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(1)
  @Max(120)
  age?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' || !value ? null : value))
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsIn(['male', 'female', 'other'])
  gender?: GenderType | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm?: number | null;

  @IsOptional()
  @Transform(toNullableNumber)
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' || !value ? null : value))
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsIn(['sedentary', 'light', 'moderate', 'active', 'very_active'])
  activityLevel?: ActivityLevel | null;
}
