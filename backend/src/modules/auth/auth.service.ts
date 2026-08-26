import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';

export class AuthService {
  static async register(email: string, password: string, username?: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error('Bu e-posta adresi ile zaten bir hesap mevcut.');
    }

    const generatedUsername = username?.trim() || email.split('@')[0] + Math.floor(1000 + Math.random() * 9000);
    const existingUsername = await prisma.user.findUnique({ where: { username: generatedUsername } });
    if (existingUsername) {
      throw new Error('Bu kullanıcı adı zaten alınmış.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: generatedUsername,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true
      }
    });

    const token = this.generateToken(user.id, user.email, user.username);
    return { user, token };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Geçersiz e-posta veya şifre.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Geçersiz e-posta veya şifre.');
    }

    const token = this.generateToken(user.id, user.email, user.username);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt
      },
      token
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            watchlist: true,
            followers: true,
            following: true,
            reviews: true
          }
        }
      }
    });

    if (!user) throw new Error('Kullanıcı bulunamadı.');
    return user;
  }

  private static generateToken(id: string, email: string, username: string) {
    const secret = process.env.JWT_SECRET || 'bingetracker_super_secret_jwt_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ id, email, username }, secret, { expiresIn: (expiresIn as any) });
  }
}
