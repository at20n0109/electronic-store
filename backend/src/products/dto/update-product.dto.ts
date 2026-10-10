import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Images are either an absolute https URL (an external CDN) or a same-origin
 * absolute path, which is what the upload endpoint hands back. The leading
 * slash may not be followed by another slash, so protocol-relative
 * `//evil.example` and `data:` / `javascript:` payloads are all rejected.
 */
const IMAGE_URL = /^(?:https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/;

class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(IMAGE_URL, {
    message:
      'url must be an https URL or a path starting with a single forward slash',
  })
  @MaxLength(2048)
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  alt?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(64)
  sku?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @IsObject()
  @IsOptional()
  specs?: Record<string, string>;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  @IsOptional()
  images?: CreateProductImageDto[];
}
