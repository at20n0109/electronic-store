import { Logger as NestLogger } from '@nestjs/common';

export function createLogger() {
  return new NestLogger('Application');
}

export { NestLogger };
