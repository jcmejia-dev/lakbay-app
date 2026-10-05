declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AVATARS?: R2Bucket;
    APP_BASE_URL?: string;
    AUTH_SESSION_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}
