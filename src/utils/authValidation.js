/**
 * Auth Validation Helpers for CineScope
 * - Display Name max length: 14 characters
 * - Password Strength Requirements: Min 8 chars, Uppercase, Lowercase, Number, Special Char
 * - Email format & domain validation
 */

export const MAX_DISPLAY_NAME_LENGTH = 14;

export const ACCEPTED_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'live.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'rediffmail.com',
  'msn.com',
  'me.com'
];

export const VALID_TLDS = [
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'in', 'uk', 'ca', 'au',
  'de', 'fr', 'es', 'it', 'nl', 'br', 'jp', 'cn', 'me', 'app', 'dev', 'tech',
  'info', 'biz', 'ai', 'tv', 'us', 'eu', 'ch', 'se', 'no', 'fi', 'ru', 'mx'
];

/**
 * Validates email format and domain
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { isValid: false, message: 'Email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic regex check for user@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid email address (e.g. user@gmail.com).' 
    };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, message: 'Email format is invalid.' };
  }

  const domain = parts[1];
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  // Check valid TLD
  if (!tld || tld.length < 2 || !VALID_TLDS.includes(tld)) {
    return { 
      isValid: false, 
      message: `Invalid email domain extension (.${tld}). Please use a valid email domain like gmail.com, hotmail.com, etc.` 
    };
  }

  // Check common typos for popular email providers
  const typoSuggestions = {
    'gmai.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmai.co': 'gmail.com',
    'gmail.co': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outlok.co': 'outlook.com',
    'yaho.com': 'yahoo.com',
    'icoud.com': 'icloud.com',
  };

  if (typoSuggestions[domain]) {
    return {
      isValid: false,
      message: `Did you mean ${parts[0]}@${typoSuggestions[domain]}?`
    };
  }

  return { isValid: true, message: '' };
};

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
