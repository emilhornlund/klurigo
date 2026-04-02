import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PexelsImageProvider from './PexelsImageProvider'

const searchPhotosMock = vi.fn()

vi.mock('../../../../api', () => ({
  useKlurigoServiceClient: () => ({
    searchPhotos: searchPhotosMock,
  }),
}))

vi.mock('../../../../styles/colors.tokens.module.scss', () => ({
  default: { colorFocusRing: 'colorFocusRing' },
}))

vi.mock('../../../../utils/helpers', () => ({
  classNames: (...parts: Array<string | undefined | false>) =>
    parts.filter(Boolean).join(' '),
}))

vi.mock('../../../Button', () => ({
  default: ({
    id,
    type,
    disabled,
    loading,
    onClick,
  }: {
    id?: string
    type?: string
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
  }) => (
    <button
      id={id}
      type={(type as 'button' | 'submit') ?? 'button'}
      disabled={disabled || loading}
      onClick={onClick}>
      {id}
    </button>
  ),
}))

vi.mock('../../../ResponsiveImage', () => ({
  default: ({
    imageURL,
    borderColor,
  }: {
    imageURL?: string
    borderColor?: string
  }) => (
    <div
      data-testid="responsive-image"
      data-url={imageURL ?? ''}
      data-border-color={borderColor ?? ''}
    />
  ),
}))

vi.mock('../../../TextField', () => ({
  default: ({
    id,
    value,
    onChange,
  }: {
    id: string
    value?: string
    onChange?: (v: string) => void
  }) => (
    <input
      data-testid={`textfield-${id}`}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

vi.mock('../../MediaModal.module.scss', () => ({ default: {} }))

const makePhotos = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    photoURL: `https://cdn/photo${i}.jpg`,
    thumbnailURL: `https://cdn/thumb${i}.jpg`,
  }))

describe('PexelsImageProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search form with Button disabled when search term is empty', () => {
    render(<PexelsImageProvider />)
    const btn = document.getElementById('image-search-button')
    expect(btn).toBeDisabled()
  })

  it('enables search button when searchTerm has a value', () => {
    render(<PexelsImageProvider />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'cats' },
    })
    expect(document.getElementById('image-search-button')).not.toBeDisabled()
  })

  it('calls searchPhotos with the current search term on button click', async () => {
    searchPhotosMock.mockResolvedValue({ photos: makePhotos(2) })

    render(<PexelsImageProvider />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'nature' },
    })
    fireEvent.click(
      document.getElementById('image-search-button') as HTMLElement,
    )

    expect(searchPhotosMock).toHaveBeenCalledWith('nature')
    await waitFor(() =>
      expect(screen.getAllByTestId('responsive-image')).toHaveLength(2),
    )
  })

  it('submits search via form Enter key', async () => {
    searchPhotosMock.mockResolvedValue({ photos: makePhotos(1) })

    render(<PexelsImageProvider />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'mountains' },
    })

    const form = screen
      .getByTestId('textfield-image-search-textfield')
      .closest('form')
    fireEvent.submit(form as HTMLFormElement)

    expect(searchPhotosMock).toHaveBeenCalledWith('mountains')
    await waitFor(() =>
      expect(screen.getByTestId('responsive-image')).toBeInTheDocument(),
    )
  })

  it('does not call searchPhotos when search term is blank', () => {
    render(<PexelsImageProvider />)
    fireEvent.submit(
      screen
        .getByTestId('textfield-image-search-textfield')
        .closest('form') as HTMLFormElement,
    )
    expect(searchPhotosMock).not.toHaveBeenCalled()
  })

  it('calls onChange with the photo URL when an image is selected', async () => {
    const photos = makePhotos(1)
    searchPhotosMock.mockResolvedValue({ photos })
    const onChange = vi.fn()

    render(<PexelsImageProvider onChange={onChange} />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'sky' },
    })
    fireEvent.click(
      document.getElementById('image-search-button') as HTMLElement,
    )

    await waitFor(() =>
      expect(screen.getByTestId('responsive-image')).toBeInTheDocument(),
    )

    const itemBtn = screen
      .getByTestId('responsive-image')
      .closest('button') as HTMLElement
    fireEvent.click(itemBtn)

    expect(onChange).toHaveBeenCalledWith(photos[0].photoURL)
  })

  it('applies focus borderColor to selected image and transparent to others', async () => {
    const photos = makePhotos(2)
    searchPhotosMock.mockResolvedValue({ photos })

    render(<PexelsImageProvider />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'ocean' },
    })
    fireEvent.click(
      document.getElementById('image-search-button') as HTMLElement,
    )

    await waitFor(() =>
      expect(screen.getAllByTestId('responsive-image')).toHaveLength(2),
    )

    const images = screen.getAllByTestId('responsive-image')
    images.forEach((img) =>
      expect(img).toHaveAttribute('data-border-color', 'transparent'),
    )

    fireEvent.click(images[0].closest('button') as HTMLElement)

    expect(images[0]).toHaveAttribute('data-border-color', 'colorFocusRing')
    expect(images[1]).toHaveAttribute('data-border-color', 'transparent')
  })

  it('resets selected image when a new search is performed', async () => {
    const photos = makePhotos(1)
    searchPhotosMock.mockResolvedValue({ photos })

    render(<PexelsImageProvider />)
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'first' },
    })
    fireEvent.click(
      document.getElementById('image-search-button') as HTMLElement,
    )

    await waitFor(() =>
      expect(screen.getByTestId('responsive-image')).toBeInTheDocument(),
    )
    fireEvent.click(
      screen.getByTestId('responsive-image').closest('button') as HTMLElement,
    )
    expect(screen.getByTestId('responsive-image')).toHaveAttribute(
      'data-border-color',
      'colorFocusRing',
    )

    searchPhotosMock.mockResolvedValue({ photos: makePhotos(1) })
    fireEvent.change(screen.getByTestId('textfield-image-search-textfield'), {
      target: { value: 'second' },
    })
    fireEvent.click(
      document.getElementById('image-search-button') as HTMLElement,
    )

    await waitFor(() => {
      const imgs = screen.getAllByTestId('responsive-image')
      expect(imgs[0]).toHaveAttribute('data-border-color', 'transparent')
    })
  })
})
