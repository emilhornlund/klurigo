import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { Typography } from '../../../components'

import styles from './NonInteractiveInfoBox.module.scss'

export type NonInteractiveInfoBoxProps = {
  info: string
}

const NonInteractiveInfoBox: FC<NonInteractiveInfoBoxProps> = ({ info }) => {
  return (
    <div className={styles.nonInteractiveInfoBox}>
      <FontAwesomeIcon icon={faCircleInfo} />
      <Typography variant="title2" color="inverse">
        {info}
      </Typography>
    </div>
  )
}

export default NonInteractiveInfoBox
