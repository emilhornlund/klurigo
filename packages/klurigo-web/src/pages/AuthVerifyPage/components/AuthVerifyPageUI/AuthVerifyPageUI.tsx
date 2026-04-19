import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'
import { Link } from 'react-router-dom'

import { Badge, LoadingSpinner, Page, Typography } from '../../../../components'

export interface AuthVerifyPageUIProps {
  verified: boolean
  loggedIn: boolean
  error?: boolean
}

const AuthVerifyPageUI: FC<AuthVerifyPageUIProps> = ({
  verified,
  loggedIn,
  error,
}) => (
  <Page>
    {verified && !error && (
      <>
        <Badge size="large" backgroundColor="green">
          <FontAwesomeIcon icon={faCheck} />
        </Badge>

        <Typography
          variant="title"
          width="medium"
          align="center"
          color="inverse">
          Hooray! Your email’s all set!
        </Typography>

        <Typography
          variant="body"
          width="medium"
          align="center"
          color="inverse">
          Welcome aboard the fun train. Let’s roll!
        </Typography>

        {loggedIn ? (
          <Typography
            variant="link"
            width="small"
            align="center"
            color="inverse"
            asChild>
            <Link to={'/'}>Take me home</Link>
          </Typography>
        ) : (
          <Typography
            variant="link"
            width="small"
            align="center"
            color="inverse"
            asChild>
            <Link to={'/auth/login'}>Log in to get started!</Link>
          </Typography>
        )}
      </>
    )}

    {!verified && !error && (
      <>
        <Typography
          variant="title"
          width="medium"
          align="center"
          color="inverse">
          One moment… verifying your magic link!
        </Typography>

        <LoadingSpinner />

        <Typography variant="body" width="small" align="center" color="inverse">
          Good things come to those who wait!
        </Typography>
      </>
    )}

    {error && (
      <>
        <Badge size="large" backgroundColor="red">
          <FontAwesomeIcon icon={faXmark} />
        </Badge>

        <Typography
          variant="title"
          width="medium"
          align="center"
          color="inverse">
          Oops! Something went wrong.
        </Typography>

        <Typography
          variant="body"
          width="medium"
          align="center"
          color="inverse">
          The supplied link is invalid or has expired.
        </Typography>
      </>
    )}
  </Page>
)

export default AuthVerifyPageUI
