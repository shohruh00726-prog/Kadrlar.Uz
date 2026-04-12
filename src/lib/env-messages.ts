/** Shown when a server/public env var is missing in deployed environments. */
export const VERCEL_ENV_VARS_HINT =
  "In Vercel: Project → Settings → Environment Variables → set the value for Production (and Preview if you use it).";

export function missingEnvMessage(name: string): string {
  return `Missing required environment variable: ${name}. ${VERCEL_ENV_VARS_HINT}`;
}

export const GENERATE_SECRET_CMD =
  'Generate a secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
