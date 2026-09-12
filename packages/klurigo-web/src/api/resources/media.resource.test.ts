import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiClientCore } from '../api-client-core'

import { createMediaResource } from './media.resource'
import type { MediaResourceDeps } from './media.resource'

vi.mock('../api.utils', () => ({
  parseQueryParams: vi.fn(() => '?search=cat&offset=0&limit=50'),
}))

const makeApi = (): {
  api: ApiClientCore
  apiGet: ReturnType<typeof vi.fn>
  apiDelete: ReturnType<typeof vi.fn>
  apiUpload: ReturnType<typeof vi.fn>
} => {
  const apiGet = vi.fn()
  const apiDelete = vi.fn()
  const apiUpload = vi.fn()

  const api = {
    apiFetch: vi.fn(),
    apiGet,
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete,
    apiUpload,
  } as unknown as ApiClientCore

  return { api, apiGet, apiDelete, apiUpload }
}

const makeDeps = (overrides?: Partial<MediaResourceDeps>) => {
  const deps: MediaResourceDeps = {
    getToken: vi.fn(),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    ...overrides,
  }

  return deps
}

describe('createMediaResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searchPhotos calls apiGet with parseQueryParams output', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)

    apiGet.mockResolvedValue({ items: [], limit: 50, offset: 0, total: 0 })
    await expect(media.searchPhotos('cat')).resolves.toEqual({
      items: [],
      limit: 50,
      offset: 0,
      total: 0,
    })

    expect(apiGet).toHaveBeenCalledWith(
      '/media/photos?search=cat&offset=0&limit=50',
    )
    expect(deps.notifyError).not.toHaveBeenCalled()
  })

  it('searchPhotos notifies error and rethrows when apiGet rejects', async () => {
    const { api, apiGet } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)
    const err = new Error('Search failed')
    apiGet.mockRejectedValue(err)

    await expect(media.searchPhotos('cat')).rejects.toBe(err)
    expect(deps.notifyError).toHaveBeenCalledWith(
      'We couldn’t search for images right now. Please try again.',
    )
  })

  it('deleteUploadedImage calls apiDelete with the correct path', async () => {
    const { api, apiDelete } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)

    apiDelete.mockResolvedValue(undefined)
    await expect(media.deleteUploadedImage('p1')).resolves.toBeUndefined()

    expect(apiDelete).toHaveBeenCalledWith('/media/uploads/photos/p1')
    expect(deps.notifyError).not.toHaveBeenCalled()
  })

  it('deleteUploadedImage notifies error and rethrows when apiDelete rejects', async () => {
    const { api, apiDelete } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)
    const err = new Error('Delete failed')
    apiDelete.mockRejectedValue(err)

    await expect(media.deleteUploadedImage('p1')).rejects.toBe(err)
    expect(deps.notifyError).toHaveBeenCalledWith(
      'We couldn’t delete that image right now. Please try again.',
    )
  })

  it('uploadImage calls apiUpload with correct path, forwards onProgress, and builds FormData with the file', async () => {
    const { api, apiUpload } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)

    const onProgress = vi.fn()
    const file = new File(['x'], 'x.png', { type: 'image/png' })

    const response = { id: 'photo1' }
    apiUpload.mockResolvedValue(response)

    await expect(media.uploadImage(file, onProgress)).resolves.toEqual(response)

    expect(apiUpload).toHaveBeenCalledTimes(1)

    const [path, createFormData, options] = apiUpload.mock.calls[0] as [
      string,
      () => FormData,
      { onProgress?: (progress: number) => void },
    ]

    expect(path).toBe('/media/uploads/photos')
    expect(options).toEqual({ onProgress })

    const appendMock = vi.fn()
    class TestFormData {
      append = appendMock
    }

    const OriginalFormData = globalThis.FormData
    vi.stubGlobal('FormData', TestFormData as unknown as typeof FormData)

    try {
      const formData = createFormData()
      expect(formData).toBeInstanceOf(TestFormData)
      expect(appendMock).toHaveBeenCalledWith('file', file)
    } finally {
      vi.unstubAllGlobals()
      globalThis.FormData = OriginalFormData
    }

    expect(deps.notifySuccess).toHaveBeenCalledWith(
      'Upload complete! Your image is ready to use.',
    )
    expect(deps.notifyError).not.toHaveBeenCalled()
  })

  it('uploadImage notifies error and rethrows when apiUpload rejects', async () => {
    const { api, apiUpload } = makeApi()
    const deps = makeDeps()

    const media = createMediaResource(api, deps)

    const onProgress = vi.fn()
    const file = new File(['x'], 'x.png', { type: 'image/png' })

    const err = new Error('Upload failed')
    apiUpload.mockRejectedValue(err)

    await expect(media.uploadImage(file, onProgress)).rejects.toBe(err)

    expect(deps.notifyError).toHaveBeenCalledWith(
      'Upload failed. Please try again.',
    )
    expect(deps.notifySuccess).not.toHaveBeenCalled()
  })
})
