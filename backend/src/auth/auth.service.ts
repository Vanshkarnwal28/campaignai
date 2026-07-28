import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * AuthService — migrated to Firebase Authentication.
 * Replaced bcrypt-based login with Firebase Authentication and Admin SDK.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, name: string, password?: string, preferredLanguage?: string) {
    try {
      let userId: string;
      
      if (!process.env.FIREBASE_PROJECT_ID) {
        // Mock register flow
        const existing = await this.firebase.getUserByEmail(email);
        if (existing) {
          throw new ConflictException('User with this email already exists');
        }
        userId = this.firebase.generateId();
      } else {
        // 1. Create User in Firebase Authentication
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });
        userId = userRecord.uid;
      }

      // 2. Save User Document to Firestore using Firebase Auth UID
      const user = await this.firebase.createUser({
        email,
        name,
        passwordHash: password || null, // Stored for local mock validation check
        role: 'MEMBER',
        preferredLanguage: preferredLanguage || 'English',
      }, userId);

      // 3. Create default Business workspace
      const business = await this.firebase.createBusiness({
        name: `${name}'s Workspace`,
        ownerId: userId,
      });

      // 4. Create initial FREE subscription
      await this.firebase.createSubscription({
        businessId: business.id,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      // Return local token fallback or custom token
      const token = await this.generateToken(userId, email, 'MEMBER');
      return {
        user: { id: userId, email, name, role: 'MEMBER', businessId: business.id, preferredLanguage: preferredLanguage || 'English' },
        token,
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('User with this email already exists');
      }
      throw new ConflictException(error.message);
    }
  }

  async login(email: string, password?: string) {
    try {
      let userId: string;
      let name: string;
      let role: string;
      let token: string;

      if (!process.env.FIREBASE_PROJECT_ID) {
        // Mock login flow
        const userDoc = await this.firebase.getUserByEmail(email);
        if (!userDoc) {
          throw new UnauthorizedException('User not found in system');
        }
        
        // Support default admin credentials or registered mock users
        if (email === 'admin@campaignai.com') {
          if (password !== 'password123') {
            throw new UnauthorizedException('Invalid credentials');
          }
        } else if (userDoc.passwordHash && password !== userDoc.passwordHash) {
          throw new UnauthorizedException('Invalid credentials');
        }

        userId = userDoc.id;
        name = userDoc.name;
        role = userDoc.role;
        token = await this.generateToken(userId, email, role);
      } else {
        // Real authentication using Firebase Client Auth REST API
        const apiKey = process.env.FIREBASE_API_KEY;
        if (!apiKey) {
          throw new UnauthorizedException('FIREBASE_API_KEY is not defined in .env');
        }

        const res = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            email,
            password,
            returnSecureToken: true,
          },
        );

        userId = res.data.localId;
        token = res.data.idToken;

        const userDoc = await this.firebase.getUserById(userId);
        name = userDoc?.name || res.data.displayName || 'User';
        role = userDoc?.role || 'MEMBER';
      }

      // Get user businesses
      const businesses = await this.firebase.getBusinessesByUserId(userId);
      const businessId = businesses[0]?.id || null;

      return {
        user: { id: userId, email, name, role, businessId },
        token,
      };
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async adminLogin(email: string, password?: string) {
    const result = await this.login(email, password);
    if (result.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Access Denied: Only Administrator accounts can access the Admin Portal.');
    }
    return result;
  }

  async checkOnboardingCompleted(businessId: string): Promise<boolean> {
    const profile = await this.firebase.getBusinessProfile(businessId);
    return !!profile;
  }

  // Password Reset Stub
  async sendPasswordResetEmail(email: string) {
    // Admin SDK allows generating reset links
    const link = await admin.auth().generatePasswordResetLink(email);
    // In production, we'd send this link via email. We prepare the architecture here.
    return { success: true, message: 'Password reset email architecture prepared', link };
  }

  // Email Verification Stub
  async sendEmailVerificationLink(email: string) {
    const link = await admin.auth().generateEmailVerificationLink(email);
    // In production, we'd send this link via email. We prepare the architecture here.
    return { success: true, message: 'Email verification architecture prepared', link };
  }

  private async generateToken(userId: string, email: string, role: string) {
    // Generates both a custom token and local JWT signature for guard fallbacks
    return this.jwtService.sign({ sub: userId, email, role });
  }

  async syncUserProfile(userId: string, email: string, name: string, businessName?: string, preferredLanguage?: string) {
    let user = await this.firebase.getUserById(userId);
    let businessId: string | null = null;
    let bName: string | null = null;

    if (!user) {
      // 1. Save User Document to Firestore
      user = await this.firebase.createUser({
        email,
        name,
        passwordHash: null,
        role: 'MEMBER',
        preferredLanguage: preferredLanguage || 'English',
      }, userId);

      // 2. Create default Business workspace
      const business = await this.firebase.createBusiness({
        name: businessName || `${name}'s Workspace`,
        ownerId: userId,
      });
      businessId = business.id;
      bName = business.name;

      // 3. Create initial FREE subscription
      await this.firebase.createSubscription({
        businessId: business.id,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    } else {
      // Get existing user business
      const businesses = await this.firebase.getBusinessesByUserId(userId);
      businessId = businesses[0]?.id || null;
      bName = businesses[0]?.name || null;

      // Update preferredLanguage if passed and different
      if (preferredLanguage && user.preferredLanguage !== preferredLanguage) {
        user = await this.firebase.createUser({
          ...user,
          preferredLanguage,
        }, userId);
      }
    }

    return {
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId,
        businessName: bName,
        preferredLanguage: user.preferredLanguage || 'English',
      },
    };
  }
  async updateUserLanguage(userId: string, preferredLanguage: string) {
    const user = await this.firebase.getUserById(userId);
    if (user) {
      await this.firebase.createUser({
        ...user,
        preferredLanguage,
      }, userId);
    }
  }

  async validateUser(userId: string) {
    let user = await this.firebase.getUserById(userId);
    if (!user) {
      try {
        const userRecord = await admin.auth().getUser(userId);
        user = await this.firebase.createUser({
          email: userRecord.email!,
          name: userRecord.displayName || 'User',
          passwordHash: null,
          role: 'MEMBER',
          preferredLanguage: 'English',
        }, userId);

        const business = await this.firebase.createBusiness({
          name: `${userRecord.displayName || 'User'}'s Workspace`,
          ownerId: userId,
        });

        await this.firebase.createSubscription({
          businessId: business.id,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      } catch (e) {
        return null;
      }
    }

    const businesses = await this.firebase.getBusinessesByUserId(userId);
    return {
      ...user,
      businesses: businesses.map((b) => ({ businessId: b.id, business: b })),
    };
  }
}
