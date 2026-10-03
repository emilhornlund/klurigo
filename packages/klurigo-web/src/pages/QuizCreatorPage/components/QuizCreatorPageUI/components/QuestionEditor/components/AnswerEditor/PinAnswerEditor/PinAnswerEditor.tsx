import type { QuestionPinTolerance } from '@klurigo/common'
import type { FC } from 'react'

import { Typography } from '../../../../../../../../../components'
import { EditorSection, FieldWrapper } from '../../shared'

import PinImageEditor, { type PinImageEditorProps } from './PinImageEditor'
import PinToleranceField from './PinToleranceField'

export type PinAnswerEditorProps = PinImageEditorProps & {
  onToleranceChange: (value?: QuestionPinTolerance) => void
  footer?: string
}

const PinAnswerEditor: FC<PinAnswerEditorProps> = ({
  onToleranceChange,
  footer,
  ...imageProps
}) => (
  <>
    <EditorSection>
      <FieldWrapper label="Pin location" footer={footer} required>
        <Typography variant="control2" color="muted" noOpacity>
          Add an image and place the pin at the correct location.
        </Typography>
        <PinImageEditor {...imageProps} />
      </FieldWrapper>
    </EditorSection>
    <EditorSection>
      <PinToleranceField
        value={imageProps.tolerance}
        validation={imageProps.validation}
        validationRevealed={imageProps.validationRevealed}
        onChange={onToleranceChange}
      />
    </EditorSection>
  </>
)

export default PinAnswerEditor
