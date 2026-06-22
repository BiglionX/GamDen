/**
 * 游客态响应工具
 * 坐标模糊化、权限位构造、响应包装
 */

/**
 * 坐标模糊化（游客态）
 * 返回 "XX·XX" 格式，末位用 · 替代
 */
export const maskCoordinate = (x: number, y: number): string => {
  const maskX = String(x);
  const maskY = String(y);
  return `${maskX.slice(0, -1)}· / ${maskY.slice(0, -1)}·`;
};

/**
 * 构造游客态权限限制位
 */
export const buildGuestLimits = (limits?: {
  canLike?: boolean;
  canComment?: boolean;
  canExchange?: boolean;
  canPost?: boolean;
  canChat?: boolean;
  canGreet?: boolean;
  canJoinClub?: boolean;
}) => {
  return {
    can_like: false,
    can_comment: false,
    can_exchange: false,
    can_post: false,
    can_chat: false,
    can_greet: false,
    can_join_club: false,
    ...limits,
  };
};

/**
 * 包装游客态响应
 * 追加 identity_type 和权限位
 */
export const wrapGuestPayload = <T>(
  data: T,
  limits?: Partial<ReturnType<typeof buildGuestLimits>>
) => {
  return {
    identity_type: 'guest' as const,
    ...data,
    ...buildGuestLimits(limits),
  };
};

/**
 * 包装用户态响应
 */
export const wrapUserPayload = <T>(data: T) => {
  return {
    identity_type: 'user' as const,
    ...data,
  };
};
