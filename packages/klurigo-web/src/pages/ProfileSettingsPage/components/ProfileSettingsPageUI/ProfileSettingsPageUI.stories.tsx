import { AuthProvider } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import ProfileSettingsPageUI from './ProfileSettingsPageUI'

const meta = {
  title: 'Pages/ProfileSettingsPage',
  component: ProfileSettingsPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ProfileSettingsPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    authProvider: AuthProvider.Local,
    values: {
      email: '',
      unverifiedEmail: undefined,
      givenName: '',
      familyName: '',
      defaultNickname: '',
    },
    loading: false,
    loadingPassword: false,
    onChange: () => undefined,
    onChangePassword: () => undefined,
    onClickResendVerificationEmail: () => undefined,
  },
} satisfies Story

export const UnverifiedEmail = {
  args: {
    authProvider: AuthProvider.Local,
    values: {
      email: 'user@example.com',
      unverifiedEmail: 'user@example.com',
      givenName: '',
      familyName: '',
      defaultNickname: '',
    },
    loading: false,
    loadingPassword: false,
    onChange: () => undefined,
    onChangePassword: () => undefined,
    onClickResendVerificationEmail: () => undefined,
  },
} satisfies Story
