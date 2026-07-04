/**
 * passwordPolicy.js - Login password strength validation.
 */

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
}

export function validatePassword(password) {
  if (password.length < PASSWORD_RULES.minLength) {
    return `Password must be at least ${PASSWORD_RULES.minLength} characters.`
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.'
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.'
  }
  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    return 'Password must include at least one number.'
  }
  if (PASSWORD_RULES.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character.'
  }
  return null
}
