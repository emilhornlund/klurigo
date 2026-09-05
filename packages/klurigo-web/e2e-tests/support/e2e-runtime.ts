import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'

export const E2E_API_BASE_URL =
  process.env.KLURIGO_SERVICE_PROXY || 'http://localhost:8080/api'
export const E2E_USER_PASSWORD = E2E_FIXTURE_MANIFEST.password
