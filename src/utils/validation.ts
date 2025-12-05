/**
 * Validation utility functions for email and password
 */

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  // Trim whitespace
  email = email.trim();

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  // More strict validation
  const strictEmailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!strictEmailRegex.test(email)) {
    return { isValid: false, error: 'Email contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with isValid boolean, strength level, and error message if invalid
 */
export const validatePassword = (password: string): { 
  isValid: boolean; 
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  error?: string;
  suggestions?: string[];
} => {
  if (!password) {
    return { 
      isValid: false, 
      strength: 'weak',
      error: 'Password is required' 
    };
  }

  const suggestions: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';

  // Minimum length check
  if (password.length < 8) {
    return { 
      isValid: false, 
      strength: 'weak',
      error: 'Password must be at least 8 characters long',
      suggestions: ['Use at least 8 characters']
    };
  }

  // Check for various character types
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // Count how many criteria are met
  let criteriaCount = 0;
  if (hasLowerCase) criteriaCount++;
  if (hasUpperCase) criteriaCount++;
  if (hasNumbers) criteriaCount++;
  if (hasSpecialChar) criteriaCount++;

  // Build suggestions
  if (!hasLowerCase) suggestions.push('Add lowercase letters');
  if (!hasUpperCase) suggestions.push('Add uppercase letters');
  if (!hasNumbers) suggestions.push('Add numbers');
  if (!hasSpecialChar) suggestions.push('Add special characters (!@#$%^&*)');

  // Determine strength
  if (password.length >= 12 && criteriaCount >= 4) {
    strength = 'very-strong';
  } else if (password.length >= 10 && criteriaCount >= 3) {
    strength = 'strong';
  } else if (password.length >= 8 && criteriaCount >= 2) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  // Minimum requirements: at least 8 chars and 2 different character types
  if (criteriaCount < 2) {
    return {
      isValid: false,
      strength,
      error: 'Password must contain at least 2 of: uppercase, lowercase, numbers, special characters',
      suggestions
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin123', 'letmein', 'welcome', 'monkey', 'dragon'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      strength: 'weak',
      error: 'This password is too common. Please choose a stronger password',
      suggestions: ['Avoid common passwords', 'Use a unique combination']
    };
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    suggestions.push('Avoid sequential characters (abc, 123)');
  }

  return {
    isValid: true,
    strength,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

/**
 * Get password strength color
 */
export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong' | 'very-strong'): string => {
  switch (strength) {
    case 'weak':
      return '#FF3B30';
    case 'medium':
      return '#FF9500';
    case 'strong':
      return '#4CD964';
    case 'very-strong':
      return '#34C759';
    default:
      return '#999';
  }
};

/**
 * Get password strength text
 */
export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong' | 'very-strong'): string => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    case 'very-strong':
      return 'Very Strong';
    default:
      return '';
  }
};
