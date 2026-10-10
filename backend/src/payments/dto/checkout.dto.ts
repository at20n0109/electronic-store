import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CheckoutDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'provider must be lowercase letters, digits or hyphens',
  })
  provider?: string;
}
