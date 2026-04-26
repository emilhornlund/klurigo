import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  UPLOAD_IMAGE_MAX_FILE_SIZE,
  UPLOAD_IMAGE_MIN_FILE_SIZE,
} from '@klurigo/common'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

import { classNames } from '../../utils/helpers'
import { notifyWarning } from '../../utils/notification'
import CircularProgressBar, {
  CircularProgressBarKind,
} from '../CircularProgressBar'
import Typography from '../Typography'

import styles from './Dropzone.module.scss'

export interface DropzoneProps {
  progress?: number
  onUpload?: (file: File) => void
}

const Dropzone: FC<DropzoneProps> = ({ progress, onUpload }) => {
  const onDropAccepted = useCallback(
    (files: File[]) => {
      onUpload?.(files[0])
    },
    [onUpload],
  )

  const onDropRejected = useCallback(() => {
    notifyWarning('Upload failed. The file type or size may be invalid.')
  }, [])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: {
      'image/gif': ['.gif'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff'],
      'image/webp': ['.webp'],
    },
    minSize: UPLOAD_IMAGE_MIN_FILE_SIZE,
    maxSize: UPLOAD_IMAGE_MAX_FILE_SIZE,
    multiple: false,
    onDropAccepted,
    onDropRejected,
  })

  return (
    <div className={styles.dropzone}>
      <div
        {...getRootProps({
          className: classNames(
            styles.base,
            isFocused ? styles.focused : undefined,
            isDragAccept ? styles.accept : undefined,
            isDragReject ? styles.reject : undefined,
          ),
        })}>
        {typeof progress === 'number' ? (
          <CircularProgressBar
            kind={CircularProgressBarKind.Secondary}
            progress={progress}
          />
        ) : (
          <>
            <input {...getInputProps()} />
            {isDragActive ? (
              <Typography variant="body2" align="center" color="subtle">
                Drop the files here ...
              </Typography>
            ) : (
              <div className={styles.content}>
                <FontAwesomeIcon
                  icon={faArrowUpFromBracket}
                  className={styles.icon}
                />
                <Typography variant="body2" align="center" color="default">
                  Drag &#39;n&#39; drop a file here, or click to select one
                </Typography>
                <Typography variant="control" align="center" color="subtle">
                  PNG, JPG, GIF, TIFF or WEBP - Max 20 MB
                </Typography>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Dropzone
