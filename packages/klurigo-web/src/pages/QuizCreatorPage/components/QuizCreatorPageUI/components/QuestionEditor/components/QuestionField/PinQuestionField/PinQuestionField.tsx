import { faPlus, faRetweet, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { QuestionPinDto } from '@klurigo/common'
import { MediaType, QuestionPinTolerance } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import {
  Button,
  ConfirmDialog,
  MediaModal,
  PinImage,
} from '../../../../../../../../../components'

import styles from './PinQuestionField.module.scss'

export type PinQuestionFieldSubfields = Pick<
  QuestionPinDto,
  'imageURL' | 'positionX' | 'positionY'
>

export type PinQuestionFieldProps = {
  imageURL?: string
  position?: { x?: number; y?: number }
  tolerance?: QuestionPinTolerance
  onImageUrlChange: (value?: string) => void
  onPositionChange: (value?: { x: number; y: number }) => void
}

const PinQuestionField: FC<PinQuestionFieldProps> = ({
  imageURL,
  position,
  tolerance,
  onImageUrlChange,
  onPositionChange,
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [showConfirmDeleteImage, setShowConfirmDeleteImage] = useState(false)

  return (
    <>
      <div className={styles.pinQuestionField}>
        {imageURL ? (
          <PinImage
            imageURL={imageURL}
            value={{ x: position?.x ?? 0.5, y: position?.y ?? 0.5, tolerance }}
            alt={imageURL}
            onChange={onPositionChange}>
            <div className={styles.overlay}>
              <div className={styles.actions}>
                <Button
                  id="replace-image-button"
                  type="button"
                  variant="primary"
                  surface="brand"
                  intent="accent"
                  size="small"
                  icon={faRetweet}
                  onClick={() => setShowMediaModal(true)}
                />
                <Button
                  id="delete-image-button"
                  type="button"
                  variant="primary"
                  surface="brand"
                  intent="danger"
                  size="small"
                  icon={faTrash}
                  onClick={() => setShowConfirmDeleteImage(true)}
                />
              </div>
            </div>
          </PinImage>
        ) : (
          <Button
            id="add-image-button"
            type="button"
            variant="primary"
            surface="brand"
            intent="accent"
            size="small"
            value="Add Pin Image"
            icon={faPlus}
            onClick={() => setShowMediaModal(true)}
          />
        )}
      </div>
      {showMediaModal && (
        <MediaModal
          title="Add Pin Image"
          type={MediaType.Image}
          url={imageURL}
          onChange={(newValue) => onImageUrlChange(newValue?.url)}
          onClose={() => setShowMediaModal(false)}
          imageOnly
        />
      )}

      <ConfirmDialog
        title="Confirm Remove Image"
        message="Are you sure you want to remove this image?"
        open={showConfirmDeleteImage}
        confirmTitle="Yes"
        closeTitle="No"
        onConfirm={() => {
          onImageUrlChange(undefined)
          setShowConfirmDeleteImage(false)
        }}
        onClose={() => setShowConfirmDeleteImage(false)}
        destructive
      />
    </>
  )
}

export default PinQuestionField
