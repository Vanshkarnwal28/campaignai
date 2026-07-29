import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentStatusDto {
  @IsNotEmpty({ message: 'Payment Request ID is required' })
  @IsString({ message: 'Payment Request ID must be a string' })
  paymentRequestId: string;
}
