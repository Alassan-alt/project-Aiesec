import jwt from 'jsonwebtoken';
export function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 16) {
        throw new Error('JWT_SECRET must be set (min length 16)');
    }
    return secret;
}
export function signAdminJwt(payload) {
    return jwt.sign(payload, getJwtSecret(), {
        algorithm: 'HS256',
        expiresIn: '12h',
    });
}
export function requireAdmin(req, res, next) {
    const auth = req.header('authorization') || '';
    const [, token] = auth.split(' ');
    if (!token)
        return res.status(401).json({ error: 'missing_token' });
    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.admin = decoded;
        next();
    }
    catch {
        return res.status(401).json({ error: 'invalid_token' });
    }
}
export function getAdmin(req) {
    return req.admin ?? null;
}
