import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as admin from 'firebase-admin';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('config')
  async getConfig() {
    return {
      apiKey: process.env.FIREBASE_API_KEY || null,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      authDomain: process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com` : null,
    };
  }

  @Post('sync')
  async sync(
    @Request() req: any,
    @Body() body: { name?: string; businessName?: string; preferredLanguage?: string },
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const synced = await this.authService.syncUserProfile(
        decoded.uid,
        decoded.email || `${decoded.uid}@user.com`,
        body.name || decoded.name || 'User',
        body.businessName,
        body.preferredLanguage,
      );
      
      const businessId = synced.user.businessId;
      const businessName = synced.user.businessName || null;
      let onboardingCompleted = false;
      if (businessId) {
        onboardingCompleted = await this.authService.checkOnboardingCompleted(businessId);
      }
      
      return {
        ...synced,
        user: {
          ...synced.user,
          businessName,
          onboardingCompleted,
        }
      };
    } catch (e) {
      throw new UnauthorizedException('Authentication token invalid or expired: ' + e.message);
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.name, body.password, body.preferredLanguage);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('admin/login')
  async adminLogin(@Body() body: any) {
    return this.authService.adminLogin(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/language')
  async updateLanguage(@Request() req: any, @Body() body: { preferredLanguage: string }) {
    const user = req.user;
    await this.authService.updateUserLanguage(user.id, body.preferredLanguage);
    return { success: true, preferredLanguage: body.preferredLanguage };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    const user = req.user;
    const businessId = user.businesses[0]?.businessId || null;
    const businessName = user.businesses[0]?.business?.name || null;
    let onboardingCompleted = false;
    if (businessId) {
      onboardingCompleted = await this.authService.checkOnboardingCompleted(businessId);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId,
      businessName,
      onboardingCompleted,
      preferredLanguage: user.preferredLanguage || 'English',
    };
  }
}
