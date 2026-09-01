import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import { doc, firestoreDb, updateDoc } from './database';
import { ApiUser, JwtPayload } from './types';

dotenv.config();
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres.');

declare global { namespace Express { interface Request { user?: JwtPayload; } } }

function legacyHashPassword(password: string): string {
  let hash = 0;
  for (let index = 0; index < password.length; index++) { hash = (hash << 5) - hash + password.charCodeAt(index); hash |= 0; }
  return `sec_hash_${hash.toString(16)}`;
}
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export async function verifyAndMigratePassword(user: ApiUser, password: string): Promise<boolean> {
  const legacy = user.senhaHash.startsWith('sec_hash_');
  const valid = legacy ? user.senhaHash === legacyHashPassword(password) : await bcrypt.compare(password, user.senhaHash);
  if (valid && legacy) {
    const senhaHash = await hashPassword(password);
    await updateDoc(doc(firestoreDb, 'usuarios', user.id), { senhaHash });
    user.senhaHash = senhaHash;
  }
  return valid;
}
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  if (typeof data === 'object') return Object.fromEntries(Object.entries(data as Record<string, any>).filter(([, value]) => value !== undefined).map(([key, value]) => [key, sanitizeForFirestore(value)])) as T;
  return data;
}
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  try { req.user = jwt.verify(token, JWT_SECRET) as JwtPayload; next(); }
  catch { return res.status(403).json({ error: 'Token inválido ou expirado' }); }
}
const attempts = new Map<string, { count: number; resetAt: number }>();
export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
  const now = Date.now(); const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return next(); }
  if (current.count >= 8) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  current.count += 1; next();
}
