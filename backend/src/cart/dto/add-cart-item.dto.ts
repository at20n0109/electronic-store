import { IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}
