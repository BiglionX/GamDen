import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * 加密密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * 验证密码
 */
export const comparePassword = async (
  password: string, 
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * 验证密码强度
 * 至少8位，包含大小写字母和数字
 */
export const validatePasswordStrength = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
