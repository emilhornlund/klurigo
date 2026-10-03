import { faRetweet, faTrash } from '@fortawesome/free-solid-svg-icons'
import { MediaType, QuestionPinTolerance } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import {
  Button,
  ConfirmDialog,
  InputError,
  MediaModal,
  PinImage,
} from '../../../../../../../../../components'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../validation-rules'
import { EmptyMediaField } from '../../shared'

import styles from './PinAnswerEditor.module.scss'

export type PinImageEditorProps = {
  imageURL?: string
  position?: { x?: number; y?: number }
  tolerance?: QuestionPinTolerance
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onImageUrlChange: (value?: string) => void
  onPositionChange: (value?: { x: number; y: number }) => void
}

const PinImageEditor: FC<PinImageEditorProps> = ({
  imageURL,
  position,
  tolerance,
  validation,
  validationRevealed = false,
  onImageUrlChange,
  onPositionChange,
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [showConfirmDeleteImage, setShowConfirmDeleteImage] = useState(false)
  const [imageInteracted, setImageInteracted] = useState(false)

  const showMissingImageError =
    !imageURL && (imageInteracted || validationRevealed)
  const hasInvalidPosition =
    getValidationErrorMessage(validation, 'positionX') !== undefined ||
    getValidationErrorMessage(validation, 'positionY') !== undefined

  return (
    <>
      <div className={styles.root}>
        {imageURL ? (
          <>
            <PinImage
              imageURL={imageURL}
              value={{
                x: position?.x ?? 0.5,
                y: position?.y ?? 0.5,
                tolerance,
              }}
              alt={imageURL}
              onChange={onPositionChange}>
              <div className={styles.overlay}>
                <div
                  className={styles.actions}
                  onPointerDown={(event) => event.stopPropagation()}>
                  <Button
                    id="replace-image-button"
                    type="button"
                    variant="plain"
                    surface="light"
                    size="small"
                    icon={faRetweet}
                    onClick={() => {
                      setImageInteracted(true)
                      setShowMediaModal(true)
                    }}
                  />
                  <Button
                    id="delete-image-button"
                    type="button"
                    variant="plain"
                    surface="light"
                    intent="danger"
                    size="small"
                    icon={faTrash}
                    onClick={() => setShowConfirmDeleteImage(true)}
                  />
                </div>
              </div>
            </PinImage>

            <div className={styles.pinInstruction}>
              Place the pin on the correct location.
            </div>
          </>
        ) : (
          <EmptyMediaField
            variant="image"
            title="Add image to pin question"
            description="Click to choose an image"
            errorMessage={
              showMissingImageError
                ? 'An image is required for Pin questions.'
                : undefined
            }
            onClick={() => {
              setImageInteracted(true)
              setShowMediaModal(true)
            }}
          />
        )}
        {validationRevealed && imageURL && hasInvalidPosition && (
          <InputError message="The pin position is invalid. Place the pin on the image again." />
        )}
      </div>

      {showMediaModal && (
        <MediaModal
          title={imageURL ? 'Replace Pin Image' : 'Add Pin Image'}
          type={MediaType.Image}
          url={imageURL}
          onChange={(newValue) => onImageUrlChange(newValue?.url)}
          onClose={() => setShowMediaModal(false)}
          lockedType
        />
      )}

      <ConfirmDialog
        title="Confirm Remove Image"
        message="Are you sure you want to remove this image?"
        open={showConfirmDeleteImage}
        confirmTitle="Yes"
        closeTitle="No"
        onConfirm={() => {
          setImageInteracted(true)
          onImageUrlChange(undefined)
          setShowConfirmDeleteImage(false)
        }}
        onClose={() => setShowConfirmDeleteImage(false)}
        destructive
      />
    </>
  )
}

export default PinImageEditor
