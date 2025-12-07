/**
 * API Key Security Utilities
 * 
 * Runtime validation and security checks for Google Maps API key usage.
 * This module provides utilities to detect security issues at runtime.
 */

/**
 * Check if we're running in a secure environment
 */
export function isSecureEnvironment(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: always secure (API key not exposed)
    return true;
  }

  // Client-side: check if we're on a secure domain
  const hostname = window.location.hostname;
  
  // Production domain
  if (hostname === 'resources.sageoutdooradvisory.com') {
    return true;
  }
  
  // Any sageoutdooradvisory.com subdomain
  if (hostname.endsWith('.sageoutdooradvisory.com')) {
    return true;
  }
  
  // Localhost (development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Vercel preview deployments
  if (hostname.endsWith('.vercel.app')) {
    return true;
  }
  
  return false;
}

/**
 * Get security warnings for current environment
 */
export function getSecurityWarnings(): string[] {
  const warnings: string[] = [];
  
  if (typeof window === 'undefined') {
    return warnings; // Server-side: no warnings
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Check for HTTP in production (should be HTTPS)
  if (protocol === 'http:' && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    warnings.push('⚠️ Using HTTP instead of HTTPS. API key restrictions may not work correctly.');
  }
  
  // Check for unknown domain
  if (!isSecureEnvironment()) {
    warnings.push(
      `⚠️ Unknown domain: ${hostname}. Ensure this domain is added to API key restrictions in Google Cloud Console.`
    );
  }
  
  return warnings;
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKeyFormat(apiKey: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is not set',
    };
  }
  
  if (apiKey.length < 20) {
    return {
      valid: false,
      error: 'API key appears to be too short',
    };
  }
  
  // Google API keys typically start with 'AIza' or similar
  // But we won't enforce this as formats may vary
  
  return {
    valid: true,
  };
}

/**
 * Log security information (only in development)
 */
export function logSecurityInfo(apiKey: string | undefined): void {
  if (process.env.NODE_ENV !== 'development') {
    return; // Don't log in production
  }
  
  const validation = validateApiKeyFormat(apiKey);
  const isSecure = isSecureEnvironment();
  const warnings = getSecurityWarnings();
  
  console.group('🔐 API Key Security Info');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Secure Environment:', isSecure ? '✅ Yes' : '❌ No');
  console.log('API Key Valid:', validation.valid ? '✅ Yes' : `❌ No (${validation.error})`);
  
  if (warnings.length > 0) {
    console.warn('Security Warnings:');
    warnings.forEach((warning) => console.warn(`  ${warning}`));
  }
  
  if (typeof window !== 'undefined') {
    console.log('Current Domain:', window.location.hostname);
    console.log('Protocol:', window.location.protocol);
  }
  
  console.groupEnd();
}

/**
 * Get recommended HTTP referrers for current environment
 */
export function getRecommendedReferrers(): string[] {
  const referrers: string[] = [];
  
  if (typeof window === 'undefined') {
    // Server-side: return production referrers
    return [
      'https://resources.sageoutdooradvisory.com/*',
      'https://*.sageoutdooradvisory.com/*',
      'http://localhost:3000/*',
      'http://localhost:3001/*',
    ];
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Add current domain
  referrers.push(`${protocol}//${hostname}/*`);
  
  // Add production domains
  referrers.push('https://resources.sageoutdooradvisory.com/*');
  referrers.push('https://*.sageoutdooradvisory.com/*');
  
  // Add localhost if in development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    referrers.push('http://localhost:3000/*');
    referrers.push('http://localhost:3001/*');
  }
  
  // Add Vercel preview if applicable
  if (hostname.endsWith('.vercel.app')) {
    referrers.push('https://*.vercel.app/*');
  }
  
  return [...new Set(referrers)]; // Remove duplicates
}
