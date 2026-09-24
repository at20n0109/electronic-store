import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  receiverName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  receiverPhone: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  receiverAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
