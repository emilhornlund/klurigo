import type { FC } from 'react'

import { LoadingSpinner, Page, Typography } from '../../../../components'

const AuthGoogleCallbackPageUI: FC = () => {
  return (
    <Page>
      <Typography variant="title" width="small">
        Hold tight—calling in the Google cavalry!
      </Typography>
      <Typography variant="text" width="small">
        We’re doing the secret handshake with Google. Almost there…
      </Typography>
      <LoadingSpinner />
    </Page>
  )
}

export default AuthGoogleCallbackPageUI
