import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      include: { faculty: { include: { school: true } } },
    });
    if (!dept) throw new BadRequestException('Department not found');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        student: {
          create: {
            name: dto.name,
            schoolId: dto.schoolId,
            departmentId: dto.departmentId,
            matricYear: dto.matricYear,
            currentLevel: dto.currentLevel ?? 100,
          },
        },
      },
      include: { student: true },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitize(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.refreshToken) throw new UnauthorizedException();

      const matches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!matches) throw new UnauthorizedException('Refresh token invalid');

      const tokens = await this.generateTokens(user.id, user.email);
      await this.saveRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            school: true,
            department: { include: { faculty: true } },
          },
        },
      },
    });
    return this.sanitize(user);
  }

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') },
      ),
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const hashed = await bcrypt.hash(token, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashed } });
  }

  private sanitize(user: any) {
    const { password, refreshToken, ...safe } = user;
    return safe;
  }
}
