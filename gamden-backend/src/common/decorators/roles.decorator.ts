import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

export const ROLES_KEY = 'gamden:roles';

/**
 * 限制路由可访问的角色
 * @example @Roles('registered', 'admin')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
