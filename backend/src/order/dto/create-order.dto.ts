import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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

  /**
   * Street-level detail, which is all a human needs. The machine-readable
   * location comes from the three codes below: a courier needs a GHN ward code
   * to route a parcel, and free text cannot be turned into one reliably.
   */
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  receiverAddress: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  receiverProvinceId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  receiverDistrictId?: number;

  /** GHN ward codes are numeric strings, not integers. */
  @IsOptional()
  @Matches(/^\d{1,12}$/, {
    message: 'receiverWardCode phải là mã phường/xã do GHN cấp',
  })
  receiverWardCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
