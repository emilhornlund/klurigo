import { faQuestionCircle, faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { Typography } from '../../../components'
import { QuestionTypeLabels } from '../../../models'
import colors from '../../../styles/colors.tokens.module.scss'

import styles from './QuestionTypePointsBar.module.scss'

export type QuestionTypePointsBarProps = {
  mode: GameMode
  questionType: QuestionType
  questionPoints?: number
}

const QuestionTypePointsBar: FC<QuestionTypePointsBarProps> = ({
  mode,
  questionType,
  questionPoints,
}) =>
  mode === GameMode.Classic ? (
    <div className={styles.chip}>
      <Typography variant="body2" color="inverse" noOpacity bold>
        <FontAwesomeIcon
          icon={faQuestionCircle}
          color={colors.colorTextInverse}
        />
        {QuestionTypeLabels[questionType]}
      </Typography>
      <Typography variant="body2" color="inverse" noOpacity noWrap bold>
        <FontAwesomeIcon icon={faStar} color={colors.colorRatingDefault} />
        {questionPoints === 0 && 'Zero Points'}
        {questionPoints === 1000 && 'Standard Points'}
        {questionPoints === 2000 && 'Double Points'}
      </Typography>
    </div>
  ) : null

export default QuestionTypePointsBar
