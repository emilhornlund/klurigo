import { faHeartCrack } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'
import { useNavigate, useRouteError } from 'react-router-dom'

import { IconButtonArrowLeft, Page, Typography } from '../../components'

import styles from './ErrorPage.module.scss'

const ErrorPage: FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const error: any = useRouteError()
  const navigate = useNavigate()

  return (
    <Page
      header={
        <IconButtonArrowLeft
          id="go-back"
          type="button"
          size="small"
          value="Go Back"
          onClick={() => {
            navigate(-1)
          }}
        />
      }
      profile>
      <div className={styles.errorIcon}>
        <FontAwesomeIcon icon={faHeartCrack} />
      </div>
      <Typography variant="title" width="medium">
        Oops! Something went wrong.
      </Typography>
      <Typography variant="subtitle" width="medium">
        {error?.statusText || 'An unexpected error occurred.'}
      </Typography>
      <Typography variant="text" width="medium">
        {error?.data ||
          'Please try refreshing the page or go back to the homepage.'}
      </Typography>
    </Page>
  )
}

export default ErrorPage
