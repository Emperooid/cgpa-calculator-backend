import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    // Warm up the Neon DB connection so the first real query isn't slow
    await (this.prisma.$queryRaw`SELECT 1` as Promise<unknown>).catch(() => {});
    return { status: 'ok', ts: Date.now() };
  }
}
