import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { users, childProfiles } from '@kiddies/db';
import { createChildSchema, updateChildPinSchema, childLoginSchema } from '../schemas/auth.schemas.js';
import { hashPin, verifyPin } from '../utils/password.js';
import { requireRole } from '../middleware/auth.middleware.js';

// PIN attempt tracking (use Redis in production)
const pinAttempts = new Map<string, { count: number; lockedUntil?: number }>();

export async function childAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /child/list?parentEmail=... — public, returns child names for login UI
  fastify.get('/child/list', async (request, reply) => {
    const { parentEmail } = request.query as { parentEmail?: string };
    if (!parentEmail) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'parentEmail required' } });

    const [parent] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, parentEmail), eq(users.role, 'parent')));
    if (!parent) return reply.send({ success: true, data: [] });

    const children = await db.select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      ageGroup: childProfiles.ageGroup,
    }).from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(and(eq(childProfiles.parentId, parent.id), eq(users.isActive, true)));

    return reply.send({ success: true, data: children });
  });

  // POST /child/login
  fastify.post('/child/login', async (request, reply) => {
    const result = childLoginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten().fieldErrors },
      });
    }

    const { parentEmail, childId, pin } = result.data;

    // Check lock
    const attempts = pinAttempts.get(childId);
    if (attempts?.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remainingMs = attempts.lockedUntil - Date.now();
      return reply.status(429).send({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Try again in ${Math.ceil(remainingMs / 60000)} minutes`,
        },
      });
    }

    // Find parent by email
    const [parent] = await db.select({ id: users.id }).from(users).where(
      and(eq(users.email, parentEmail), eq(users.role, 'parent'))
    );
    if (!parent) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
    }

    // Find child + verify belongs to parent
    const [child] = await db.select().from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(and(eq(users.id, childId), eq(childProfiles.parentId, parent.id), eq(users.isActive, true)));

    if (!child) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
    }

    const childUser = child.users;
    if (!childUser.pinHash) {
      return reply.status(401).send({ success: false, error: { code: 'NO_PIN', message: 'No PIN set for this account' } });
    }

    const pinValid = await verifyPin(pin, childUser.pinHash);
    if (!pinValid) {
      const current = pinAttempts.get(childId) ?? { count: 0 };
      const newCount = current.count + 1;
      if (newCount >= 5) {
        pinAttempts.set(childId, { count: newCount, lockedUntil: Date.now() + 15 * 60 * 1000 });
      } else {
        pinAttempts.set(childId, { count: newCount });
      }
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_PIN', message: `Incorrect PIN. ${5 - newCount} attempts remaining` },
      });
    }

    // Success - clear attempts
    pinAttempts.delete(childId);

    const accessToken = fastify.jwt.sign(
      { sub: childUser.id, role: 'child', parentId: parent.id },
      { expiresIn: '8h' }, // Children have longer sessions
    );

    return reply.send({
      success: true,
      data: {
        user: {
          id: childUser.id,
          displayName: childUser.displayName,
          role: 'child',
          parentId: parent.id,
          avatarUrl: childUser.avatarUrl,
        },
        tokens: { accessToken, expiresIn: 28800 },
      },
    });
  });

  // POST /child/create (requires parent JWT)
  fastify.post('/child/create', {
    preHandler: [requireRole('parent')],
  }, async (request, reply) => {
    const result = createChildSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: result.error.flatten().fieldErrors },
      });
    }

    const { displayName, dateOfBirth, pin, screenTimeLimitMinutes } = result.data;
    const parentId = request.authUser.id;

    // Compute age group from date of birth
    const birthYear = new Date(dateOfBirth).getFullYear();
    const age = new Date().getFullYear() - birthYear;
    const ageGroup = age < 5 ? 'toddler' : age < 9 ? 'early-child' : age < 13 ? 'tween' : 'teen';

    const pinHash = await hashPin(pin);
    const [childUser] = await db.insert(users).values({
      role: 'child',
      displayName,
      pinHash,
      isActive: true,
      isVerified: true,
    }).returning();

    if (!childUser) throw new Error('Failed to create child user');

    const [profile] = await db.insert(childProfiles).values({
      userId: childUser.id,
      parentId,
      dateOfBirth,
      ageGroup,
      screenTimeDailyLimitMinutes: screenTimeLimitMinutes,
    }).returning();

    return reply.status(201).send({
      success: true,
      data: {
        child: {
          id: childUser.id,
          displayName: childUser.displayName,
          dateOfBirth,
          ageGroup: profile?.ageGroup,
          screenTimeDailyLimitMinutes: profile?.screenTimeDailyLimitMinutes,
        },
      },
    });
  });

  // PUT /child/:childId/pin (requires parent JWT)
  fastify.put('/child/:childId/pin', {
    preHandler: [requireRole('parent')],
  }, async (request, reply) => {
    const result = updateChildPinSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
    }

    const { childId } = request.params as { childId: string };
    const parentId = request.authUser.id;

    // Verify parent owns child
    const [child] = await db.select().from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(and(eq(users.id, childId), eq(childProfiles.parentId, parentId)));

    if (!child) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Child not found' } });
    }

    const childUser = child.users;
    if (childUser.pinHash) {
      const currentValid = await verifyPin(result.data.currentPin, childUser.pinHash);
      if (!currentValid) {
        return reply.status(401).send({ success: false, error: { code: 'INVALID_PIN', message: 'Current PIN is incorrect' } });
      }
    }

    const newPinHash = await hashPin(result.data.newPin);
    await db.update(users).set({ pinHash: newPinHash }).where(eq(users.id, childId));

    // Clear any lockout
    pinAttempts.delete(childId);

    return reply.send({ success: true, data: { message: 'PIN updated successfully' } });
  });
}
