import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@storebuilder/database';
import { RegisterDto, LoginDto, AuthResponse, JwtPayload, ReferralStats, PlanKey, StaffSession, StaffRolePreset, StaffPermission, TRIAL_DAYS } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/** Every new merchant starts on a Business-plan trial (see lib/billing.ts). */
function trialData() {
  return { plan: 'ENTERPRISE' as const, billingCycle: 'TRIAL', planExpiresAt: new Date(Date.now() + TRIAL_DAYS * 864e5), trialUsed: true, planChangedAt: new Date() };
}

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters');
  return s;
}

function randomReferralCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  return code;
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${randomReferralCode()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export class AuthService {
  async register(dto: RegisterDto & { phone?: string }): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError(409, 'البريد الإلكتروني مسجل مسبقاً');

    let referredById: string | undefined;
    if (dto.referralCode?.trim()) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: dto.referralCode.trim().toUpperCase() } });
      if (referrer) referredById = referrer.id;
    }

    const rounds = Math.min(Number(process.env.BCRYPT_ROUNDS ?? 12), 14);
    const hashed = await bcrypt.hash(dto.password, rounds);
    const referralCode = await generateUniqueReferralCode();
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: 'MERCHANT',
        referralCode,
        ...(referredById ? { referredById } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
        ...trialData(),
      },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { token, user: this.toPublic(user) };
  }

  async registerCustomer(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError(409, 'البريد الإلكتروني مسجل مسبقاً');

    const rounds = Math.min(Number(process.env.BCRYPT_ROUNDS ?? 12), 14);
    const hashed = await bcrypt.hash(dto.password, rounds);
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: 'CUSTOMER',
      },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { token, user: this.toPublic(user) };
  }

  async googleAuth(credential: string): Promise<AuthResponse> {
    if (!process.env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google Sign-In not configured');

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError(400, 'Invalid Google token');

    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
      }
      if (!user.isActive) throw new AppError(403, 'الحساب موقوف');
    } else {
      const referralCode = await generateUniqueReferralCode();
      user = await prisma.user.create({
        data: {
          email,
          name: name ?? email.split('@')[0],
          password: '',
          role: 'MERCHANT',
          googleId,
          referralCode,
          ...trialData(),
        },
      });
    }

    const token = this.signToken(user.id, user.email, user.role);
    return { token, user: this.toPublic(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new AppError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    if (!user.isActive) throw new AppError(403, 'الحساب موقوف');
    if (!user.password) throw new AppError(400, 'هذا الحساب مرتبط بـ Google — استخدم تسجيل الدخول بـ Google');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new AppError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');

    const token = this.signToken(user.id, user.email, user.role);
    return { token, user: this.toPublic(user) };
  }

  /** Store staff sign-in. The token is a MERCHANT token for the owner, scoped by staffId + permissions. */
  async staffLogin(dto: LoginDto): Promise<AuthResponse> {
    const staff = await prisma.staffMember.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { store: { include: { merchant: true } } },
    });
    if (!staff || !(await bcrypt.compare(dto.password, staff.password))) {
      throw new AppError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    if (!staff.isActive) throw new AppError(403, 'تم إيقاف حساب الموظف — تواصل مع صاحب المتجر');
    const owner = staff.store.merchant;
    if (!owner.isActive) throw new AppError(403, 'هذا المتجر موقوف');

    await prisma.staffMember.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });

    const session = this.toStaffSession(staff);
    const payload: JwtPayload = {
      userId: owner.id, email: staff.email, role: 'MERCHANT', storeId: staff.storeId,
      staffId: staff.id, permissions: session.permissions, warehouseId: session.warehouseId,
    };
    const token = jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions);
    return { token, user: { ...this.toPublic({ ...owner, name: staff.name, email: staff.email }), staff: session } };
  }

  async getStaffMe(staffId: string): Promise<AuthResponse['user']> {
    const staff = await prisma.staffMember.findUnique({ where: { id: staffId }, include: { store: { include: { merchant: true } } } });
    if (!staff || !staff.isActive) throw new AppError(401, 'تم إيقاف حساب الموظف');
    return { ...this.toPublic({ ...staff.store.merchant, name: staff.name, email: staff.email }), staff: this.toStaffSession(staff) };
  }

  private toStaffSession(staff: { id: string; name: string; role: string; permissions: unknown; warehouseId: string | null }): StaffSession {
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role as StaffRolePreset,
      permissions: (Array.isArray(staff.permissions) ? staff.permissions : []) as StaffPermission[],
      warehouseId: staff.warehouseId,
    };
  }

  async getMe(userId: string): Promise<AuthResponse['user']> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');
    return this.toPublic(user);
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        freeMonthsCredit: true,
        referrals: {
          select: { name: true, plan: true, createdAt: true, referralRewardGiven: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new AppError(404, 'User not found');

    if (!user.referralCode) {
      const referralCode = await generateUniqueReferralCode();
      await prisma.user.update({ where: { id: userId }, data: { referralCode } });
      user.referralCode = referralCode;
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return {
      referralCode: user.referralCode,
      referralLink: `${appUrl}/register?ref=${user.referralCode}`,
      totalReferred: user.referrals.length,
      freeMonthsCredit: user.freeMonthsCredit,
      referrals: user.referrals.map(r => ({
        name: r.name, plan: r.plan as PlanKey, joinedAt: r.createdAt.toISOString(), rewardGiven: r.referralRewardGiven,
      })),
    };
  }

  private toPublic(user: {
    id: string; email: string; name: string; role: string;
    plan: string; isActive: boolean; createdAt: Date; referralCode?: string | null;
  }): AuthResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthResponse['user']['role'],
      plan: user.plan as AuthResponse['user']['plan'],
      isActive: user.isActive,
      referralCode: user.referralCode ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private signToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = { userId, email, role: role as JwtPayload['role'] };
    return jwt.sign(payload, getSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
