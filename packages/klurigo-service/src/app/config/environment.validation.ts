import Joi from 'joi'

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  ENVIRONMENT: Joi.string().valid('local', 'beta', 'prod', 'test').required(),
  SERVER_PORT: Joi.number().port().default(8080),
  SERVER_ALLOW_ORIGIN: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  MONGODB_HOST: Joi.string().required(),
  MONGODB_PORT: Joi.number().port().required(),
  MONGODB_USERNAME: Joi.string().optional(),
  MONGODB_PASSWORD: Joi.string().optional(),
  MONGODB_DB: Joi.string().required(),
  JWT_SECRET: Joi.string().min(1).required(),
  PEXELS_API_KEY: Joi.string().required(),
  UPLOAD_DIRECTORY: Joi.string().required(),
  EMAIL_ENABLED: Joi.boolean().default(true),
  EMAIL_USERNAME: Joi.string().optional(),
  EMAIL_PASSWORD: Joi.string().optional(),
  KLURIGO_URL: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_REDIRECT_URI: Joi.string().required(),
  DISCOVERY_SEED_ON_INIT: Joi.boolean().optional().default(false),
})
