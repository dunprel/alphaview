// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user;
    return field ? user?.[field] : user?.userId;
  },
);

// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles     = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// public.decorator.ts
import { SetMetadata as SM } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public        = () => SM(IS_PUBLIC_KEY, true);

// raw-body.decorator.ts
import { createParamDecorator as CPD, ExecutionContext as EC } from '@nestjs/common';
export const RawBody = CPD((_: unknown, ctx: EC) =>
  ctx.switchToHttp().getRequest().rawBody,
);
