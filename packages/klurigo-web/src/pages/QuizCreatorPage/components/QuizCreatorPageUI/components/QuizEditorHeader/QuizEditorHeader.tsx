import {
  faArrowRightFromBracket,
  faFloppyDisk,
  faGear,
} from '@fortawesome/free-solid-svg-icons'
import type { FC } from 'react'

import { Button, TextField } from '../../../../../../components'
import { DeviceType } from '../../../../../../utils/device-size.types'
import { useDeviceSizeType } from '../../../../../../utils/useDeviceSizeType'
import type {
  QuizSettingsModel,
  QuizSettingsModelFieldChangeFunction,
  QuizSettingsValidationResult,
} from '../../../../utils/QuizSettingsDataSource'

export interface QuizEditorHeaderProps {
  quizSettings: QuizSettingsModel
  quizSettingsValidation: QuizSettingsValidationResult
  onQuizSettingsValueChange: QuizSettingsModelFieldChangeFunction
  canSaveQuiz: boolean
  isSavingQuiz?: boolean
  onOpenSettings: () => void
  onSaveQuiz: () => void
  onExit: () => void
}

const QuizEditorHeader: FC<QuizEditorHeaderProps> = ({
  quizSettings,
  quizSettingsValidation,
  onQuizSettingsValueChange,
  canSaveQuiz,
  isSavingQuiz,
  onOpenSettings,
  onSaveQuiz,
  onExit,
}) => {
  const deviceType = useDeviceSizeType()

  return (
    <>
      {deviceType !== DeviceType.Mobile && (
        <TextField
          id="quiz-title-textfield"
          type="text"
          surface="light"
          size="small"
          placeholder="Title"
          value={quizSettings.title}
          onChange={(value) =>
            onQuizSettingsValueChange('title', value as string)
          }
          customErrorMessage={
            quizSettingsValidation.errors.filter(
              ({ path }) => path === 'title',
            )?.[0]?.message
          }
          showErrorMessage={false}
          forceValidate
        />
      )}
      <Button
        id="settings-button"
        type="button"
        size="small"
        variant="primary"
        surface="brand"
        value="Settings"
        hideValue="mobile"
        icon={faGear}
        onClick={onOpenSettings}
      />
      <Button
        id="save-button"
        type="button"
        size="small"
        variant="primary"
        intent="accent"
        value="Save"
        hideValue="mobile"
        icon={faFloppyDisk}
        loading={!!isSavingQuiz}
        disabled={!canSaveQuiz}
        onClick={onSaveQuiz}
      />
      <Button
        id="exit-button"
        type="button"
        size="small"
        variant="primary"
        surface="brand"
        value="Exit"
        hideValue="mobile"
        icon={faArrowRightFromBracket}
        onClick={onExit}
      />
    </>
  )
}

export default QuizEditorHeader
