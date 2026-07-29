import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Plan name is required' })
  @IsString({ message: 'Plan name must be a string' })
  plan: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsUrl({}, { message: 'redirectUrl must be a valid URL' })
  redirectUrl?: string;
}
