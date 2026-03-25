import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { childProfiles } from '@kiddies/db';

export interface AuthUser {
  id: string;
  role: string;
  parentId: string | undefined;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as unknown as { sub: string; role: string; parentId?: string };
    request.authUser = { id: payload.sub, role: payload.role, parentId: payload.parentId ?? undefined };
  } catch {
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
}

export async function requireParent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.authUser.role !== 'parent') {
    reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Parent access required' } });
  }
}

export async function requireChild(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.authUser.role !== 'child') {
    reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Child access required' } });
  }
}

export function requireParentOfChild(childIdParam = 'childId') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireParent(request, reply);
    const params = request.params as Record<string, string>;
    const childId = params[childIdParam];
    if (!childId) return;

    const [profile] = await db
      .select({ id: childProfiles.id })
      .from(childProfiles)
      .where(and(eq(childProfiles.userId, childId), eq(childProfiles.parentId, request.authUser.id)));

    if (!profile) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this child' } });
    }
  };
}
