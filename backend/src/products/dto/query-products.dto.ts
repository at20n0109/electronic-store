import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryProductsDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;

  @IsIn(['true', 'false'])
  @IsOptional()
  inStock?: string;

  @IsIn(['price_asc', 'price_desc', 'name_asc', 'newest'])
  @IsOptional()
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'newest' = 'newest';
}
