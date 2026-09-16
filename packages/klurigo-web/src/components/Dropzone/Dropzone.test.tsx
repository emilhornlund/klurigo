import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Dropzone from './Dropzone'

const { notifyWarning } = vi.hoisted(() => ({
  notifyWarning: vi.fn(),
}))

vi.mock('../../utils/notification', () => ({
  notifyWarning,
}))

describe('Dropzone', () => {
  it('should render a Dropzone with default props', async () => {
    const { container } = render(
      <Dropzone progress={undefined} onUpload={undefined} />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render a Dropzone with progress bar', async () => {
    const { container } = render(
      <Dropzone progress={50} onUpload={undefined} />,
    )

    expect(container).toMatchSnapshot()
  })

  it('uploads an accepted image and warns for rejected files', async () => {
    const onUpload = vi.fn()
    const { container } = render(<Dropzone onUpload={onUpload} />)
    const input = container.querySelector('input[type="file"]')!
    const acceptedFile = new File(['image'], 'image.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [acceptedFile] } })
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(acceptedFile))

    const rejectedFile = new File(['text'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [rejectedFile] } })
    await waitFor(() => {
      expect(notifyWarning).toHaveBeenCalledWith(
        'Upload failed. The file type or size may be invalid.',
      )
    })
  })

  it('shows the active drag message', () => {
    const { container } = render(<Dropzone />)
    const dropTarget = container.querySelector('.base')!
    const file = new File(['image'], 'image.png', { type: 'image/png' })

    fireEvent.dragEnter(dropTarget, {
      dataTransfer: {
        files: [file],
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        types: ['Files'],
      },
    })

    return waitFor(() =>
      expect(screen.getByText('Drop the files here ...')).toBeInTheDocument(),
    )
  })
})
