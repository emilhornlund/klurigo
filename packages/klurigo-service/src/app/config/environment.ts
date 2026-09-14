export interface EnvironmentVariables {
  ENVIRONMENT: string
  SERVER_PORT: number
  SERVER_ALLOW_ORIGIN: string
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD: string
  REDIS_DB: number
  MONGODB_HOST: string
  MONGODB_PORT: number
  MONGODB_USERNAME: string
  MONGODB_PASSWORD: string
  MONGODB_DB: string
  JWT_SECRET: string
  PEXELS_API_KEY: string
  UPLOAD_DIRECTORY: string
  EMAIL_ENABLED: boolean
  EMAIL_USERNAME: string
  EMAIL_PASSWORD: string
  KLURIGO_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  DISCOVERY_SEED_ON_INIT: boolean
}
