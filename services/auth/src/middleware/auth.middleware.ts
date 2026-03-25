import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  role: string;
  parentId: string | undefined;
  childId: string | undefined;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as unknown as {
      sub: string;
      role: string;
      parentId?: string;
    };
    request.authUser = {
      id: payload.sub,
      role: payload.role,
      parentId: payload.parentId,
      childId: undefined,
    };
  } catch {
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (request.authUser.role !== role) {
      reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: `Requires role: ${role}` },
      });
    }
  };
}
