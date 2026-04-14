import { QuestionType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import type { FC } from 'react'
import { useState } from 'react'

import AnswerPin, { type AnswerPinProps } from './AnswerPin'

const AnswerPinComponent: FC<AnswerPinProps> = (props) => {
  const [submittedAnswer, setSubmittedAnswer] = useState<{
    type: QuestionType.Pin
    value: string
  }>()
  const [interactive, setInteractive] = useState<boolean>(props.interactive)
  const [loading, setLoading] = useState<boolean>(props.loading)

  const onSubmit = (value: { x: number; y: number }) => {
    setLoading(true)
    setInterval(() => {
      setSubmittedAnswer({
        type: QuestionType.Pin,
        value: `${value.x},${value.y}`,
      })
      setLoading(false)
      setInteractive(false)
    }, 200)
  }

  return (
    <AnswerPin
      {...props}
      submittedAnswer={submittedAnswer}
      interactive={interactive}
      loading={loading}
      onSubmit={onSubmit}
    />
  )
}

const meta = {
  title: 'Gameplay Components/AnswerPin',
  component: AnswerPin,
  render: (props) => <AnswerPinComponent {...props} />,
} satisfies Meta<typeof AnswerPin>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive = {
  name: 'Interactive',
  args: {
    imageURL:
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Europe_EU_laea_location_map_%28configurable%29.svg',
    submittedAnswer: undefined,
    interactive: true,
    loading: false,
    onSubmit: () => undefined,
  },
} satisfies Story

export const NonInteractive = {
  name: 'Non Interactive',
  args: {
    imageURL:
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Europe_EU_laea_location_map_%28configurable%29.svg',
    submittedAnswer: undefined,
    interactive: false,
    loading: false,
    onSubmit: () => undefined,
  },
} satisfies Story
