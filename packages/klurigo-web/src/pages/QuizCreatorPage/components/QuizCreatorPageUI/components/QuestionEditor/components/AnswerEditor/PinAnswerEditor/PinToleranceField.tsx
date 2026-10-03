import { QuestionPinTolerance } from '@klurigo/common'
import type { FC } from 'react'

import { Select } from '../../../../../../../../../components'
import { QuestionPinToleranceLabels } from '../../../../../../../../../models'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../validation-rules'
import { FieldWrapper } from '../../shared'

export interface PinToleranceFieldProps {
  value?: QuestionPinTolerance
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (value?: QuestionPinTolerance) => void
}

const PinToleranceField: FC<PinToleranceFieldProps> = ({
  value,
  validation,
  validationRevealed,
  onChange,
}) => (
  <FieldWrapper
    label="Tolerance"
    layout="full"
    info={
      <>
        Each level sets the maximum distance from the correct location that
        still counts as correct. Within this distance, points are awarded on a
        sliding scale: closer pins earn more points.
        <ul>
          <li>
            Low: Smallest margin of error — strictest, only near-exact
            placements score.
          </li>
          <li>Medium: Moderate margin of error — balanced strictness</li>
          <li>
            High: Wide margin of error — forgiving, but still excludes extreme
            outliers.
          </li>
          <li>
            Maximum: Largest margin of error — all placements score, but closer
            pins earn more points.
          </li>
        </ul>
      </>
    }>
    <Select
      id="pin-tolerance-select"
      value={value}
      values={Object.values(QuestionPinTolerance).map((type) => ({
        key: type,
        value: type,
        valueLabel: QuestionPinToleranceLabels[type],
      }))}
      customErrorMessage={getValidationErrorMessage(validation, 'tolerance')}
      onChange={(newValue) => onChange(newValue as QuestionPinTolerance)}
      forceValidate={validationRevealed}
    />
  </FieldWrapper>
)

export default PinToleranceField
