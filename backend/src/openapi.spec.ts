import { openApiConfig } from './openapi.js';

describe('openApiConfig', () => {
  it('publishes a versioned document with bearer auth', () => {
    const document = openApiConfig();
    expect(document.info).toMatchObject({ title: 'AgroTrust API', version: '1.0' });
    expect(document.components?.securitySchemes).toHaveProperty('bearer');
    expect(document.components?.securitySchemes).toHaveProperty('cookie');
  });
});
