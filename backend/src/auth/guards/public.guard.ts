import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

export function Public() {
  return function (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, target);
    return target;
  };
}

@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    return isPublic;
  }
}