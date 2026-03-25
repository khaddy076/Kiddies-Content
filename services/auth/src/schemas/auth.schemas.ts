import { z } from 'zod';

export const registerParentSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const childLoginSchema = z.object({
  parentEmail: z.string().email(),
  childId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createChildSchema = z.object({
  displayName: z.string().min(2).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  screenTimeLimitMinutes: z.number().int().min(30).max(480).default(120),
});

export const updateChildPinSchema = z.object({
  currentPin: z.string().regex(/^\d{4,6}$/),
  newPin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export type RegisterParentInput = z.infer<typeof registerParentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChildLoginInput = z.infer<typeof childLoginSchema>;
export type CreateChildInput = z.infer<typeof createChildSchema>;
