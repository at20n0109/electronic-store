import { IsInt, IsMimeType, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateImageUploadDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsMimeType()
  mimeType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;
}
