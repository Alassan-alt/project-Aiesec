import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export type JwtPayload = {
  sub: string
  username: string
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.trim().length < 16) {
    throw new Error('JWT_SECRET must be set (min length 16)')
  }
  return secret
}

export function signAdminJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '12h',
  })
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('authorization') || ''
  const [, token] = auth.split(' ')
  if (!token) return res.status(401).json({ error: 'missing_token' })

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload
    ;(req as any).admin = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export function getAdmin(req: Request): JwtPayload | null {
  return (req as any).admin ?? null
}
