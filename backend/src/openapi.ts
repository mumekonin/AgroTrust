import { DocumentBuilder } from '@nestjs/swagger';
import { REFRESH_COOKIE } from './auth/auth.cookies.js';

/** OpenAPI document used to generate the frontend client (§4.B.7). */
export function openApiConfig() {
  return new DocumentBuilder()
    .setTitle('AgroTrust API')
    .setDescription(
      'Fertilizer delivery. Protected routes use a bearer access token. Refresh uses the __Host-rt cookie. State-creating POSTs require an Idempotency-Key header.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE)
    .build();
}
