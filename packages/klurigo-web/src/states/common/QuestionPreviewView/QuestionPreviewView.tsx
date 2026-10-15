import { faQuestionCircle, faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import {
  InfiniteScrollContainer,
  Surface,
  Typography,
} from '../../../components'
import { QuestionTypeLabels } from '../../../models'
import colors from '../../../styles/colors.tokens.module.scss'
import { DeviceType } from '../../../utils/device-size.types'
import { useDeviceSizeType } from '../../../utils/useDeviceSizeType'

import styles from './QuestionPreviewView.module.scss'

export interface QuestionPreviewViewProps {
  mode: GameMode
  questionType: QuestionType
  question: string
  questionPoints?: number
}

const QuestionPreviewView: FC<QuestionPreviewViewProps> = ({
  mode,
  questionType,
  question,
  questionPoints,
}) => {
  const deviceType = useDeviceSizeType()
  const { speed, gap } = useMemo(() => {
    switch (deviceType) {
      case DeviceType.Mobile:
        return { speed: 70, gap: 64 }
      case DeviceType.Tablet:
        return { speed: 95, gap: 96 }
      case DeviceType.Desktop:
        return { speed: 110, gap: 128 }
      default:
        return { speed: 95, gap: 96 }
    }
  }, [deviceType])

  return (
    <div className={styles.preview} data-testid="question-preview-view">
      <InfiniteScrollContainer
        className={styles.questionText}
        enabled={true}
        pxPerSecond={speed}
        gapPx={gap}
        startDelayMs={1000}
        hAlign="center"
        vAlign="center">
        <Typography
          className={styles.question}
          variant="extraLargeTitle"
          width="medium"
          align="center"
          color="inverse">
          {question}
        </Typography>
      </InfiniteScrollContainer>

      {mode === GameMode.Classic ? (
        <div
          className={styles.metadata}
          data-testid="question-preview-metadata">
          <Surface className={styles.chip}>
            <Typography
              className={styles.metadataText}
              variant="body2"
              color="inverse"
              noOpacity
              noWrap
              bold>
              <FontAwesomeIcon
                icon={faQuestionCircle}
                color={colors.colorTextInverse}
              />
              {QuestionTypeLabels[questionType]}
            </Typography>
          </Surface>
          <Surface className={styles.chip}>
            <Typography
              className={styles.metadataText}
              variant="body2"
              color="inverse"
              noOpacity
              noWrap
              bold>
              <FontAwesomeIcon
                icon={faStar}
                color={colors.colorRatingDefault}
              />
              {questionPoints === 0 && 'Zero Points'}
              {questionPoints === 1000 && 'Standard Points'}
              {questionPoints === 2000 && 'Double Points'}
            </Typography>
          </Surface>
        </div>
      ) : null}
    </div>
  )
}

export default QuestionPreviewView
