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
  @MinLength(10)
  @MaxLength(11)
  @Matches(/^0\d{9,10}$/, {
    message:
      'receiverPhone phải là số điện thoại Việt Nam hợp lệ (bắt đầu bằng 0, 10-11 chữ số)',
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

  /**
   * GHN ward codes are opaque identifiers. Many are numeric, but some districts
   * use alphanumeric codes (e.g. "1B1731"), so the validator accepts either.
   */
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{1,20}$/, {
    message: 'receiverWardCode phải là mã phường/xã do GHN cấp',
  })
  receiverWardCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
