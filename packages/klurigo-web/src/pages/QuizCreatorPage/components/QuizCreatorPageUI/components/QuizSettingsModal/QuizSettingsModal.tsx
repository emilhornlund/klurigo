import { faPlus, faRetweet, faTrash } from '@fortawesome/free-solid-svg-icons'
import {
  LanguageCode,
  MediaType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import {
  Button,
  MediaModal,
  Modal,
  ResponsiveImage,
  Typography,
} from '../../../../../../components'
import Select from '../../../../../../components/Select'
import Textarea from '../../../../../../components/Textarea'
import TextField from '../../../../../../components/TextField'
import {
  LanguageLabels,
  QuizCategoryLabels,
  QuizVisibilityLabels,
} from '../../../../../../models'
import type {
  QuizSettingsModel,
  QuizSettingsModelFieldChangeFunction,
  QuizSettingsValidationResult,
} from '../../../../utils/QuizSettingsDataSource'
import { getValidationErrorMessage } from '../../../../validation-rules'

import styles from './QuizSettingsModal.module.scss'

export interface QuizSettingsModalProps {
  values: QuizSettingsModel
  validation: QuizSettingsValidationResult
  onValueChange: QuizSettingsModelFieldChangeFunction
  onClose: () => void
}

const QuizSettingsModal: FC<QuizSettingsModalProps> = ({
  values: {
    title,
    description,
    imageCoverURL,
    category,
    visibility,
    languageCode,
  } = {},
  validation,
  onValueChange,
  onClose,
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false)

  const handleDeleteImageCover = () => {
    onValueChange('imageCoverURL', undefined)
  }

  return (
    <Modal title="Settings" onClose={onClose} open>
      <div className={styles.quizSettingsModalWrapper}>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Title
          </Typography>
          <TextField
            id="quiz-title-textfield"
            type="text"
            kind="secondary"
            placeholder="Title"
            value={title}
            customErrorMessage={getValidationErrorMessage(validation, 'title')}
            onChange={(value) => onValueChange('title', value as string)}
            forceValidate
          />
        </div>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Description
          </Typography>
          <Textarea
            id="quiz-description-textarea"
            placeholder="Description"
            kind="secondary"
            value={description}
            customErrorMessage={getValidationErrorMessage(
              validation,
              'description',
            )}
            onChange={(value) => onValueChange('description', value as string)}
            forceValidate
          />
        </div>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Image Cover
          </Typography>
          {imageCoverURL && <ResponsiveImage imageURL={imageCoverURL} />}
          <div className={styles.actions}>
            <Button
              id="add-image-cover-button"
              type="button"
              kind="call-to-action"
              size="small"
              value={imageCoverURL ? 'Replace' : 'Add'}
              icon={imageCoverURL ? faRetweet : faPlus}
              onClick={() => setShowMediaModal(true)}
            />
            {imageCoverURL && (
              <Button
                id="delete-image-cover-button"
                type="button"
                kind="destructive"
                size="small"
                value="Delete"
                icon={faTrash}
                onClick={handleDeleteImageCover}
              />
            )}
          </div>
        </div>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Category
          </Typography>
          <Select
            id="category-select"
            kind="secondary"
            values={[
              { key: 'none', value: 'none', valueLabel: 'None' },
              ...Object.values(QuizCategory).map((category) => ({
                key: category,
                value: category,
                valueLabel: QuizCategoryLabels[category],
              })),
            ]}
            value={category || 'none'}
            customErrorMessage={getValidationErrorMessage(
              validation,
              'category',
            )}
            onChange={(value) =>
              onValueChange(
                'category',
                value === 'none' ? undefined : (value as QuizCategory),
              )
            }
          />
        </div>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Visibility
          </Typography>
          <Select
            id="visibility-select"
            kind="secondary"
            values={Object.values(QuizVisibility).map((visibility) => ({
              key: visibility,
              value: visibility,
              valueLabel: QuizVisibilityLabels[visibility],
            }))}
            value={visibility}
            customErrorMessage={getValidationErrorMessage(
              validation,
              'visibility',
            )}
            onChange={(value) =>
              onValueChange(
                'visibility',
                value === 'none' ? undefined : (value as QuizVisibility),
              )
            }
          />
        </div>
        <div className={styles.quizSettingsRow}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Language
          </Typography>
          <Select
            id="language-select"
            kind="secondary"
            values={[
              { key: 'none', value: 'none', valueLabel: 'None' },
              ...Object.values(LanguageCode).map((languageCode) => ({
                key: languageCode,
                value: languageCode,
                valueLabel: LanguageLabels[languageCode],
              })),
            ]}
            value={languageCode || 'none'}
            customErrorMessage={getValidationErrorMessage(
              validation,
              'languageCode',
            )}
            onChange={(value) =>
              onValueChange(
                'languageCode',
                value === 'none' ? undefined : (value as LanguageCode),
              )
            }
          />
        </div>
        <div className={styles.actions}>
          <Button
            id="close-button"
            type="button"
            kind="secondary"
            value="Close"
            onClick={onClose}
          />
        </div>
      </div>
      {showMediaModal && (
        <MediaModal
          title="Add Image Cover"
          type={MediaType.Image}
          url={imageCoverURL}
          onChange={(value) =>
            value &&
            value.type === MediaType.Image &&
            onValueChange('imageCoverURL', value.url)
          }
          onClose={() => setShowMediaModal(false)}
          imageOnly
        />
      )}
    </Modal>
  )
}

export default QuizSettingsModal
