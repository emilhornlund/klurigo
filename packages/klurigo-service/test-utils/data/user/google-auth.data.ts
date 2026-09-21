import { GoogleProfileDto } from '../../../src/modules/authentication/services/models'

import {
  MOCK_PRIMARY_GOOGLE_USER_ID,
  MOCK_PRIMARY_USER_EMAIL,
} from './user.data'

export const MOCK_GOOGLE_VALID_CODE = '4/0AX4XfWgDwZqp3xM0f2JjZb6X_ValidCode'

export const MOCK_GOOGLE_VALID_CODE_VERIFIER =
  'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

export const MOCK_GOOGLE_ACCESS_TOKEN_VALID = 'valid_access_token'

export const MOCK_GOOGLE_PROFILE_DTO: GoogleProfileDto = {
  id: MOCK_PRIMARY_GOOGLE_USER_ID,
  email: MOCK_PRIMARY_USER_EMAIL,
  verified_email: true,
  name: 'Jane Doe',
  given_name: 'Jane',
  family_name: 'Doe',
  picture: 'http://img',
}
