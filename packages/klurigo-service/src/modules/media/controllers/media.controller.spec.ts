import type {
  MediaUploadPhotoResponseDto,
  PaginatedMediaPhotoSearchDto,
} from '@klurigo/common'

import { buildMockPrimaryUser } from '../../../../test-utils/data'
import { MediaService } from '../services'

import { MediaController } from './media.controller'
import type { MediaPhotoSearchPageFilter } from './models'

describe(MediaController.name, () => {
  let controller: MediaController
  let mediaService: jest.Mocked<
    Pick<MediaService, 'searchPhotos' | 'deleteUploadPhoto'>
  >

  beforeEach(() => {
    mediaService = {
      searchPhotos: jest.fn(),
      deleteUploadPhoto: jest.fn(),
    }
    controller = new MediaController(mediaService as unknown as MediaService)
  })

  it('delegates photo search filters and returns the service response', async () => {
    const filter = {
      search: 'cats',
      limit: 5,
      offset: 10,
    } as MediaPhotoSearchPageFilter
    const response: PaginatedMediaPhotoSearchDto = {
      photos: [],
      total: 0,
      limit: 5,
      offset: 10,
    }
    mediaService.searchPhotos.mockResolvedValue(response)

    await expect(controller.searchPhotos(filter)).resolves.toBe(response)
    expect(mediaService.searchPhotos).toHaveBeenCalledWith('cats', 5, 10)
  })

  it('propagates photo search errors', async () => {
    const error = new Error('search failed')
    mediaService.searchPhotos.mockRejectedValue(error)

    await expect(controller.searchPhotos({})).rejects.toBe(error)
  })

  it('returns the processed filename from an upload', async () => {
    const response: MediaUploadPhotoResponseDto = {
      filename: 'user/photo.webp',
    }

    await expect(controller.uploadPhoto(response.filename)).resolves.toEqual(
      response,
    )
  })

  it('delegates deletion using the authenticated user ID', async () => {
    const user = buildMockPrimaryUser()

    await controller.deleteUploadedPhoto('photo-1', user)

    expect(mediaService.deleteUploadPhoto).toHaveBeenCalledWith(
      'photo-1',
      user._id,
    )
  })

  it('propagates deletion errors', async () => {
    const error = new Error('delete failed')
    mediaService.deleteUploadPhoto.mockRejectedValue(error)

    await expect(
      controller.deleteUploadedPhoto('photo-1', buildMockPrimaryUser()),
    ).rejects.toBe(error)
  })
})
