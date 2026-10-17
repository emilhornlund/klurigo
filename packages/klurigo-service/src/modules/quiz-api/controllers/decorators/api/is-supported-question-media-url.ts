import {
  isURL,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

const LOCAL_MEDIA_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Accept ordinary remote URLs and the HTTP(S) loopback URLs emitted by local uploads. */
function isSupportedQuestionMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false

  const options = {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  }

  if (!isURL(value, options)) return false

  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return LOCAL_MEDIA_HOSTS.has(hostname) || hostname.includes('.')
  } catch {
    return false
  }
}

@ValidatorConstraint({ name: 'supportedQuestionMediaUrl', async: false })
export class SupportedQuestionMediaUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isSupportedQuestionMediaUrl(value)
  }
}
