import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SanitizeInputMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body) {
      req.body = this.sanitize(req.body);
    }
    if (req.query) {
      req.query = this.sanitize(req.query) as Record<string, string>;
    }
    if (req.params) {
      req.params = this.sanitize(req.params) as Record<string, string>;
    }
    next();
  }

  private sanitize<T>(obj: T): T {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<[^>]*>/g, '') as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item)) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, this.sanitize(value)]),
      ) as T;
    }
    return obj;
  }
}
