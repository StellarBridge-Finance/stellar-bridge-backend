import { IsString, IsArray, IsNotEmpty, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientDto {
  @IsString() @IsNotEmpty() address: string;
  @IsNumber() amount: number;
  @IsString() @IsNotEmpty() currency: string;
}

export class CreatePayrollDto {
  @IsString() @IsNotEmpty() employer: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecipientDto)
  recipients: RecipientDto[];
  @IsString() @IsNotEmpty() currency: string;
  @IsNumber() totalAmount: number;
}
