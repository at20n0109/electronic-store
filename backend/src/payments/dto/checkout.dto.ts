import { IsOptional, IsString, MinLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MinLength(1)
  orderId: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
