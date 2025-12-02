// Base API configuration
// Environment Variables:
// - NODE_ENV: 'development' or 'production' (defaults to development)
// - COOKIE_DOMAIN: Override cookie domain (optional)
// - API_IS_HTTPS: Set to 'false' if production API is HTTP (defaults to 'true')
// - CORS_ORIGIN: Additional CORS origin (optional)
// - JWT_SECRET: Secret key for JWT tokens
// - JWT_EXPIRE: JWT expiration time (default: '7d')
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Base domain for cookie sharing across subdomains
// Development: .vos.local, Production: .evogearstudio.com
let COOKIE_DOMAIN;
if (process.env.COOKIE_DOMAIN) {
  COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
} else if (isDevelopment) {
  COOKIE_DOMAIN = '.vos.local'; // Development domain
} else {
  COOKIE_DOMAIN = '.evogearstudio.com'; // Production domain
}

// CORS origins - allow all subdomains
const CORS_ORIGINS = [
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'https://evogear.rtnglobal.co',
  // Development domains
  'https://vos.local',
  'https://api.vos.local',
  /^https?:\/\/(.*\.)?vos\.local$/,
  // Production domains
  /^https?:\/\/(.*\.)?evogearstudio\.com$/,
  /^https?:\/\/(.*\.)?evogear\.rtnglobal\.co$/
].filter(Boolean);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Cookie configuration - works across all subdomains
// For cross-origin cookies (different subdomains like api.vos.local -> vos.local),
// we need sameSite: 'none' and secure: true (browser requirement)
const getCookieOptions = () => {
  const baseOptions = {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: COOKIE_DOMAIN
  };

  if (isDevelopment) {
    // Development: vos.local and api.vos.local (HTTPS)
    // For cross-origin cookies (different subdomains), we need sameSite: 'none' and secure: true
    return {
      ...baseOptions,
      secure: true, // HTTPS required for sameSite: 'none'
      sameSite: 'none' // Required for cross-origin cookies (api.vos.local -> vos.local)
    };
  } else {
    // Production: evogearstudio.com
    // Check if API is HTTPS or HTTP (user mentioned http://api.evogearstudio.com/)
    // For cross-origin cookies, we typically need secure: true and sameSite: 'none'
    // But if API is HTTP, we use secure: false and sameSite: 'lax'
    const apiIsHttps = process.env.API_IS_HTTPS !== 'false'; // Default to true, set to 'false' if API is HTTP
    
    if (apiIsHttps) {
      // HTTPS API - use secure cookies
      return {
        ...baseOptions,
        secure: true,
        sameSite: 'none' // Required for cross-origin cookies
      };
    } else {
      // HTTP API - use non-secure cookies (not recommended for production)
      return {
        ...baseOptions,
        secure: false,
        sameSite: 'lax' // Works for same-site cookies
      };
    }
  }
};

const COOKIE_OPTIONS = getCookieOptions();

module.exports = {
  API_BASE_URL,
  CORS_ORIGINS,
  COOKIE_DOMAIN,
  JWT_SECRET,
  JWT_EXPIRE,
  COOKIE_OPTIONS
};

