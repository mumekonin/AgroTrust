import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SanitizeInputMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body) {
      req.body = this.sanitize(req.body);
    }
    this.sanitizeInPlace(req.query);
    this.sanitizeInPlace(req.params);
    next();
  }

  private sanitizeInPlace(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') value[index] = this.sanitize(item);
        else this.sanitizeInPlace(item);
      });
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string') {
        (value as Record<string, unknown>)[key] = this.sanitize(child);
      } else {
        this.sanitizeInPlace(child);
      }
    }
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
