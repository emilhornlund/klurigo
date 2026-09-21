import { QuestionImageRevealEffectType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { Modal, Select } from '../../../../../../../../../../../components'
import { ImageRevealEffectLabels } from '../../../../../../../../../../../models'
import type { QuizQuestionValidationResult } from '../../../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../../../validation-rules'

import styles from './ImageEffectModal.module.scss'

export const NONE_KEY = 'none'

export type ImageEffectModalProps = {
  title?: string
  value?: QuestionImageRevealEffectType
  validation: QuizQuestionValidationResult
  onClose: () => void
  onChangeImageEffect: (
    value?: QuestionImageRevealEffectType | undefined,
  ) => void
}

const ImageEffectModal: FC<ImageEffectModalProps> = ({
  title,
  value,
  validation,
  onClose,
  onChangeImageEffect,
}) => {
  const [selectedImageEffect, setSelectedImageEffect] = useState<
    QuestionImageRevealEffectType | undefined
  >(value)

  const onApply = () => {
    onChangeImageEffect(selectedImageEffect)
    onClose()
  }

  return (
    <Modal
      title={title || 'Add Image Effect'}
      size="normal"
      closeAction={{ label: 'Close', onClick: onClose }}
      primaryAction={{ label: 'Apply', onClick: onApply }}
      open>
      <div className={styles.imageMediaModal}>
        <Select
          id="select-image-effect"
          surface="light"
          values={[
            {
              key: NONE_KEY,
              value: NONE_KEY,
              valueLabel: 'None',
            },
            ...Object.values(QuestionImageRevealEffectType).map((type) => ({
              key: type,
              value: type,
              valueLabel: ImageRevealEffectLabels[type],
            })),
          ]}
          value={selectedImageEffect ?? NONE_KEY}
          customErrorMessage={getValidationErrorMessage(
            validation,
            'media.effect',
          )}
          onChange={(value) =>
            setSelectedImageEffect(
              value !== NONE_KEY
                ? (value as QuestionImageRevealEffectType)
                : undefined,
            )
          }
        />
      </div>
    </Modal>
  )
}

export default ImageEffectModal
