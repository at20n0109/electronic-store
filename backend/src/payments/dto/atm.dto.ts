import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AtmSubmitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  bank!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  transRef!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  timestamp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
