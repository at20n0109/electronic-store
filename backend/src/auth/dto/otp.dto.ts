import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^[+]?[0-9]{9,15}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[+]?[0-9]{9,15}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: 'Mã xác thực gồm 6 chữ số',
  })
  otp!: string;
}