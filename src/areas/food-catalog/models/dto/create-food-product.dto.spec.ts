import { ValidationPipe } from '@nestjs/common';
import { CreateFoodProductDto } from './create-food-product.dto';

describe('CreateFoodProductDto (Validation & Transformation Spec)', () => {
  let targetPipe: ValidationPipe;

  beforeEach(() => {
    targetPipe = new ValidationPipe({
      transform: true,
      whitelist: true,
    });
  });

  const metadata = {
    type: 'body' as const,
    metatype: CreateFoodProductDto,
    data: '',
  };

  it('should transform and validate standard HTML form payload with string values', async () => {
    const rawFormPayload = {
      name: 'Organic Rolled Oats',
      brand: 'Harvest Pride',
      category: 'Cereals & Breakfast',
      barcode: '9312345678901',
      servingSize: '150', // string from HTML form input
      servingUnit: 'g',
      dietaryTags: 'Vegan, Gluten-Free, Halal', // comma-separated string from HTML form
      description: 'Wholesome whole grain rolled oats.',
    };

    const transformed = (await targetPipe.transform(
      rawFormPayload,
      metadata,
    )) as CreateFoodProductDto;

    expect(transformed).toBeInstanceOf(CreateFoodProductDto);
    expect(transformed.name).toBe('Organic Rolled Oats');
    expect(transformed.servingSize).toBe(150);
    expect(typeof transformed.servingSize).toBe('number');
    expect(transformed.dietaryTags).toEqual(['Vegan', 'Gluten-Free', 'Halal']);
    expect(Array.isArray(transformed.dietaryTags)).toBe(true);
  });

  it('should transform empty dietaryTags string to an empty array', async () => {
    const rawFormPayload = {
      name: 'Plain Sparkling Water',
      brand: 'PureSpring',
      category: 'Beverages',
      barcode: '8901234567890',
      servingSize: '250',
      servingUnit: 'ml',
      dietaryTags: '', // empty input from browser form
    };

    const transformed = (await targetPipe.transform(
      rawFormPayload,
      metadata,
    )) as CreateFoodProductDto;

    expect(transformed.dietaryTags).toEqual([]);
  });

  it('should accept dietaryTags when already provided as an array', async () => {
    const payload = {
      name: 'Greek Yogurt',
      brand: 'Chobani',
      category: 'Dairy & Plant Milks',
      barcode: '089470001382',
      dietaryTags: ['Vegetarian', 'Gluten-Free'],
    };

    const transformed = (await targetPipe.transform(
      payload,
      metadata,
    )) as CreateFoodProductDto;

    expect(transformed.dietaryTags).toEqual(['Vegetarian', 'Gluten-Free']);
  });

  it('should reject when required fields are missing', async () => {
    const invalidPayload = {
      servingSize: '100',
    };

    await expect(targetPipe.transform(invalidPayload, metadata)).rejects.toThrow();
  });

  it('should reject when servingSize is a non-numeric string', async () => {
    const invalidPayload = {
      name: 'Sample Tea',
      brand: 'Twinings',
      category: 'Beverages',
      barcode: '0070177103088',
      servingSize: 'not-a-number',
    };

    await expect(targetPipe.transform(invalidPayload, metadata)).rejects.toThrow();
  });
});
