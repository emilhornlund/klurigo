import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { Meta, StoryObj } from '@storybook/react'

import Typography from '../Typography'

import Accordion from './Accordion'

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    title: 'Game rules',
    description: 'How to play with friends',
    icon: faCircleInfo,
    children: (
      <Typography variant="control" color="inverse">
        Share the game PIN with your friends. When everyone is in the lobby,
        start the game!
      </Typography>
    ),
  },
} satisfies Story

export const InitiallyExpanded = {
  args: {
    title: 'Scoring',
    defaultExpanded: true,
    children: (
      <Typography variant="control" color="inverse">
        Correct answers earn points. Check the leaderboard between rounds to see
        who’s ahead.
      </Typography>
    ),
  },
} satisfies Story
