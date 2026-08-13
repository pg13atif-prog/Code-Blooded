/**
 * Auth Validation Helpers for CineScope
 * - Display Name max length: 14 characters
 * - Password Strength Requirements: Min 8 chars, Uppercase, Lowercase, Number, Special Char
 */

export const MAX_DISPLAY_NAME_LENGTH = 14;

/**
 * Validates display name length and format
 */
export const validateDisplayName = (name) => {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Display name cannot be empty.' };
  }
  const cleanName = name.trim();
  if (cleanName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { isValid: false, message: `Display name cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters.` };
  }
  return { isValid: true, message: '' };
};

/**
 * Ensures display name never exceeds 14 characters
 */
export const formatDisplayName = (name, fallback = 'User') => {
  if (!name) return fallback.slice(0, MAX_DISPLAY_NAME_LENGTH);
  const clean = String(name).trim();
  return clean.length > MAX_DISPLAY_NAME_LENGTH ? clean.slice(0, MAX_DISPLAY_NAME_LENGTH) : clean;
};

/**
 * Evaluates password strength requirements:
 * 1. At least 8 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 lowercase letter (a-z)
 * 4. At least 1 number (0-9)
 * 5. At least 1 special character (!@#$%^&*...)
 */
export const checkPasswordStrength = (password) => {
  const pwd = password || '';
  const rules = {
    hasMinLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };

  const isValid = Object.values(rules).every(Boolean);

  let message = '';
  if (!rules.hasMinLength) {
    message = 'Password must be at least 8 characters long.';
  } else if (!rules.hasUppercase) {
    message = 'Password must contain at least one uppercase letter (A-Z).';
  } else if (!rules.hasLowercase) {
    message = 'Password must contain at least one lowercase letter (a-z).';
  } else if (!rules.hasNumber) {
    message = 'Password must contain at least one number (0-9).';
  } else if (!rules.hasSpecialChar) {
    message = 'Password must contain at least one special character (!@#$%^&*).';
  }

  return { isValid, message, rules };
};
