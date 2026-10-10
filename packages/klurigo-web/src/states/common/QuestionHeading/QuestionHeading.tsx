import type { FC } from 'react'

import { Typography } from '../../../components'

import styles from './QuestionHeading.module.scss'

export type QuestionHeadingProps = { text: string }

const QuestionHeading: FC<QuestionHeadingProps> = ({ text }) => (
  <Typography
    className={styles.questionHeading}
    variant="title"
    align="center"
    color="inverse"
    maxLines={4}
    allowMoreLines
    minFontSize={24}>
    {text}
  </Typography>
)

export default QuestionHeading
