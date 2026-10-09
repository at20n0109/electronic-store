import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\s.'-]+$/u, {
    message: 'receiverName chỉ được chứa chữ cái và khoảng trắng',
  })
  receiverName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^\d{8,20}$/, {
    message: 'receiverPhone chỉ được chứa chữ số',
  })
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
