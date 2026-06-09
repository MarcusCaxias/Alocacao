import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

export interface DecodedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'gestor' | 'viewer';
}

export function authMiddleware(allowedRoles?: ('admin' | 'gestor' | 'viewer')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado. Token não fornecido ou inválido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;
      
      // Attach user to request
      (req as any).user = decoded;

      // Check role if restrictions are specified
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ error: 'Acesso proibido. Permissões insuficientes para esta ação.' });
        }
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
  };
}
