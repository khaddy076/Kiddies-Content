import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      role: string;
      parentId?: string;
      childId?: string;
    };
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
    request.user = {
      id: payload.sub,
      role: payload.role,
      parentId: payload.parentId,
    };
  } catch {
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (request.user.role !== role) {
      reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: `Requires role: ${role}` },
      });
    }
  };
}
