import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

/**
 * FirebaseModule — Global module that provides FirebaseService
 * to every module in the application, replacing DatabaseModule (Prisma).
 */
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
