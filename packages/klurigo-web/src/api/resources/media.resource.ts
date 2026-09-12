import type {
  MediaUploadPhotoResponseDto,
  PaginatedMediaPhotoSearchDto,
} from '@klurigo/common'
import { TokenScope, TokenType } from '@klurigo/common'

import type { ApiClientCore } from '../api-client-core'
import { parseQueryParams } from '../api.utils'

/**
 * Side-effect hooks used by `createMediaResource`.
 *
 * `uploadImage` needs direct access to an access token because it uses `XMLHttpRequest`
 * rather than the shared `fetch` client core.
 */
export type MediaResourceDeps = {
  /**
   * Resolves the current token from storage/context.
   */
  getToken: (
    scope: TokenScope,
    type: TokenType.Access | TokenType.Refresh,
  ) => string | undefined

  /**
   * Emits a success notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifySuccess: (message: string) => void

  /**
   * Emits an error notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifyError: (message: string) => void
}

/**
 * Media API wrapper.
 *
 * Notes:
 * - `uploadImage` uses `XMLHttpRequest` to provide progress callbacks during upload.
 * - Other methods use the shared API client core.
 *
 * @param api - Shared API client core used for request execution where possible.
 * @param deps - Side-effect callbacks and token access required for `XMLHttpRequest` uploads.
 * @returns An object containing media-related API functions.
 */
export const createMediaResource = (
  api: ApiClientCore,
  deps: MediaResourceDeps,
) => {
  /**
   * Searches for media photos based on an optional search term.
   *
   * @param search - An optional search string to filter photo results.
   *
   * @returns A promise that resolves to a paginated list of matching media photos.
   */
  const searchPhotos = (
    search?: string,
  ): Promise<PaginatedMediaPhotoSearchDto> =>
    api
      .apiGet<PaginatedMediaPhotoSearchDto>(
        `/media/photos${parseQueryParams({ search, offset: 0, limit: 50 })}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn’t search for images right now. Please try again.',
        )
        throw error
      })

  /**
   * Uploads an image file and reports progress as a percentage.
   *
   * @param file - The image file to upload.
   * @param onProgress - Progress callback receiving an integer percentage in the range 0–100.
   * @returns A promise resolving to the uploaded image metadata.
   */
  const uploadImage = async (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<MediaUploadPhotoResponseDto> => {
    try {
      const res = await api.apiUpload<MediaUploadPhotoResponseDto>(
        '/media/uploads/photos',
        () => {
          const formData = new FormData()
          formData.append('file', file)
          return formData
        },
        { onProgress },
      )

      deps.notifySuccess('Upload complete! Your image is ready to use.')
      return res
    } catch (err) {
      deps.notifyError('Upload failed. Please try again.')
      throw err
    }
  }

  /**
   * Deletes an uploaded photo by its ID.
   *
   * @param photoId - The ID of the uploaded photo to delete.
   *
   * @returns A promise that resolves when the uploaded photo has been successfully deleted.
   */
  const deleteUploadedImage = (photoId: string): Promise<void> =>
    api.apiDelete<void>(`/media/uploads/photos/${photoId}`).catch((error) => {
      deps.notifyError(
        'We couldn’t delete that image right now. Please try again.',
      )
      throw error
    })

  return {
    searchPhotos,
    uploadImage,
    deleteUploadedImage,
  }
}
