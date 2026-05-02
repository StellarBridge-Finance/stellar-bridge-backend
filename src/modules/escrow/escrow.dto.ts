import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateEscrowDto {
  @IsString() @IsNotEmpty() depositor: string;
  @IsString() @IsNotEmpty() beneficiary: string;
  @IsNumber() amount: number;
  @IsString() @IsNotEmpty() currency: string;
}
