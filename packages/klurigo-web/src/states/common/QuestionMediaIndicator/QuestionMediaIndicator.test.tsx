import { MediaType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import QuestionMediaIndicator from './QuestionMediaIndicator'

describe('QuestionMediaIndicator', () => {
  it.each([
    [
      MediaType.Audio,
      'Audio question',
      'Listen up!',
      'The sound is coming from the host!',
    ],
    [
      MediaType.Video,
      'Video question',
      'Eyes on the big screen!',
      'The host has the video!',
    ],
  ] as const)(
    'provides an accessible %s media indicator',
    (type, accessibleLabel, label, instruction) => {
      render(<QuestionMediaIndicator type={type} />)

      expect(
        screen.getByRole('group', { name: accessibleLabel }),
      ).toBeInTheDocument()
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(instruction)).toBeInTheDocument()
      expect(document.querySelector('audio, video')).not.toBeInTheDocument()
    },
  )
})
