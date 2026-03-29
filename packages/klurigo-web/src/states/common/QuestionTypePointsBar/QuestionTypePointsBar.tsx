import { faQuestionCircle, faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import { QuestionTypeLabels } from '../../../models'
import colors from '../../../styles/colors.module.scss'

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
      <div className={styles.item}>
        <FontAwesomeIcon icon={faQuestionCircle} color={colors.white1} />
        {QuestionTypeLabels[questionType]}
      </div>
      <div className={styles.item}>
        <FontAwesomeIcon icon={faStar} color={colors.yellow2} />
        {questionPoints === 0 && 'Zero Points'}
        {questionPoints === 1000 && 'Standard Points'}
        {questionPoints === 2000 && 'Double Points'}
      </div>
    </div>
  ) : null

export default QuestionTypePointsBar
