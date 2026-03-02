import { AppController } from './app.controller';

describe('AppController', () => {
  it('health returns gateway status', () => {
    const controller = new AppController();
    const result = controller.health({});
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api-gateway');
  });
});
