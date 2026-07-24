import { Injectable, ExecutionContext, CanActivate, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import * as admin from 'firebase-admin';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing');
    }

    const token = authHeader.split(' ')[1];
    let decodedToken: any = null;

    // 1. Try to verify as Firebase ID Token
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseErr) {
      // 2. Fallback to local JWT verification (for unmodified frontend token compatibility)
      try {
        decodedToken = this.jwtService.verify(token);
      } catch (jwtErr) {
        throw new UnauthorizedException('Authentication token invalid or expired');
      }
    }

    const userId = decodedToken.uid || decodedToken.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.authService.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found in system');
    }

    request.user = user;
    return true;
  }
}
