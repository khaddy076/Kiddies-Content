import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { users, parentProfiles } from '@kiddies/db';
import {
  registerParentSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
} from '../schemas/auth.schemas.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../utils/email.js';

// In-memory token store for dev (use Redis in production)
const verificationTokens = new Map<string, { userId: string; expiresAt: number }>();
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const refreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

export async function parentAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/register
  fastify.post('/register', async (request, reply) => {
    const result = registerParentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten().fieldErrors },
      });
    }

    const { email, password, displayName, phone } = result.data;
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: strength.errors.join('. ') },
      });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return reply.status(409).send({
        success: false,
        error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists' },
      });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      role: 'parent',
      email,
      phone: phone ?? null,
      passwordHash,
      displayName,
      isActive: true,
      isVerified: false,
    }).returning();

    if (!user) throw new Error('Failed to create user');

    await db.insert(parentProfiles).values({ userId: user.id }).onConflictDoNothing();

    // Generate verification token
    const token = nanoid(32);
    verificationTokens.set(token, { userId: user.id, expiresAt: Date.now() + 24 * 3600 * 1000 });
    await sendVerificationEmail(email, displayName, token).catch(console.error);

    const accessToken = fastify.jwt.sign({ sub: user.id, role: 'parent' }, { expiresIn: '15m' });
    const refreshToken = nanoid(64);
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

    sendWelcomeEmail(email, displayName).catch(console.error);

    return reply.status(201).send({
      success: true,
      data: {
        user: { id: user.id, email, displayName, role: 'parent', isVerified: false },
        tokens: { accessToken, refreshToken, expiresIn: 900 },
      },
    });
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
    }

    const { email, password } = result.data;
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    if (!user.isActive) {
      return reply.status(403).send({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' } });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const accessToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '15m' });
    const refreshToken = nanoid(64);
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isVerified: user.isVerified,
          avatarUrl: user.avatarUrl,
        },
        tokens: { accessToken, refreshToken, expiresIn: 900 },
      },
    });
  });

  // POST /auth/verify-email
  fastify.post('/verify-email', async (request, reply) => {
    const result = verifyEmailSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token required' } });
    }

    const entry = verificationTokens.get(result.data.token);
    if (!entry || Date.now() > entry.expiresAt) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Verification token is invalid or expired' } });
    }

    await db.update(users).set({ isVerified: true }).where(eq(users.id, entry.userId));
    verificationTokens.delete(result.data.token);

    return reply.send({ success: true, data: { message: 'Email verified successfully' } });
  });

  // POST /auth/password-reset/request
  fastify.post('/password-reset/request', async (request, reply) => {
    const result = requestPasswordResetSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email required' } });
    }

    const [user] = await db.select().from(users).where(eq(users.email, result.data.email));
    if (user) {
      const token = nanoid(32);
      resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 3600 * 1000 });
      await sendPasswordResetEmail(result.data.email, user.displayName, token).catch(console.error);
    }

    // Always return success to prevent email enumeration
    return reply.send({ success: true, data: { message: 'If that email exists, a reset link has been sent' } });
  });

  // POST /auth/password-reset/confirm
  fastify.post('/password-reset/confirm', async (request, reply) => {
    const result = confirmPasswordResetSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
    }

    const entry = resetTokens.get(result.data.token);
    if (!entry || Date.now() > entry.expiresAt) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or expired' } });
    }

    const strength = validatePasswordStrength(result.data.newPassword);
    if (!strength.valid) {
      return reply.status(400).send({ success: false, error: { code: 'WEAK_PASSWORD', message: strength.errors.join('. ') } });
    }

    const newHash = await hashPassword(result.data.newPassword);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, entry.userId));
    resetTokens.delete(result.data.token);

    return reply.send({ success: true, data: { message: 'Password updated successfully' } });
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const result = refreshTokenSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Refresh token required' } });
    }

    const entry = refreshTokenStore.get(result.data.refreshToken);
    if (!entry || Date.now() > entry.expiresAt) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired' } });
    }

    const [user] = await db.select().from(users).where(eq(users.id, entry.userId));
    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'User not found' } });
    }

    refreshTokenStore.delete(result.data.refreshToken);
    const newAccessToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '15m' });
    const newRefreshToken = nanoid(64);
    refreshTokenStore.set(newRefreshToken, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

    return reply.send({
      success: true,
      data: { tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900 } },
    });
  });

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    const result = refreshTokenSchema.safeParse(request.body);
    if (result.success) {
      refreshTokenStore.delete(result.data.refreshToken);
    }
    return reply.send({ success: true, data: { message: 'Logged out successfully' } });
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: [async (req, rep) => { try { await req.jwtVerify(); } catch { rep.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }); } }] }, async (request, reply) => {
    const payload = request.user as unknown as { sub: string };
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isVerified: users.isVerified,
      avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, payload.sub));

    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return reply.send({ success: true, data: { user } });
  });
}
