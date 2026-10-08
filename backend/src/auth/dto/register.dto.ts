import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PASSWORD_STRONG_MESSAGE =
  'Mật khẩu cần tối thiểu 8 ký tự và gồm đủ chữ hoa, chữ thường, số và ký tự đặc biệt (không khoảng trắng)';

export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\sA-Za-z0-9]).{8,72}$/;

export const NAME_PATTERN = /^[\p{L}\p{M}\s.'-]+$/u;

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_STRONG_MESSAGE })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(NAME_PATTERN, {
    message: 'Họ tên chỉ được chứa chữ cái, dấu cách và dấu . - \'',
  })
  name?: string;
}