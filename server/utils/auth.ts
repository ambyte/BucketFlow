import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { JwtPayload, User } from '../../app/types'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: User, secret: string): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    role: user.role
  }

  return jwt.sign(payload, secret, { expiresIn: '24h' })
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload
  }
  catch {
    return null
  }
}
