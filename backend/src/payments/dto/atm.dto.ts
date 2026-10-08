import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AtmSubmitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  bank!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  cardNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  transRef!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
