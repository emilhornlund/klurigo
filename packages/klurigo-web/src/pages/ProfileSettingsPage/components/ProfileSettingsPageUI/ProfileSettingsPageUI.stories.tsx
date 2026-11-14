import { AuthProvider, DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import ProfileSettingsPageUI from './ProfileSettingsPageUI'
import styles from './ProfileSettingsPageUI.stories.module.scss'

const meta = {
  title: 'Pages/ProfileSettingsPage',
  component: ProfileSettingsPageUI,
  decorators: [
    withRouter,
    withMockAuth,
    (Story) => (
      <div className={styles.viewport}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ProfileSettingsPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    authProvider: AuthProvider.Local,
    onChangeAvatar: async (avatar) => avatar,
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
    onChangeAvatar: async (avatar) => avatar,
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

export const SavedAvatar = {
  args: { ...Default.args, avatar: DEFAULT_CRITTERS_AVATAR_V1 },
  render: function SavedAvatarStory(args) {
    const [avatar, setAvatar] = useState(args.avatar)
    return (
      <ProfileSettingsPageUI
        {...args}
        avatar={avatar}
        onChangeAvatar={async (next) => {
          setAvatar(next)
          return next
        }}
      />
    )
  },
} satisfies Story

export const GoogleAvatar = {
  ...SavedAvatar,
  args: {
    ...Default.args,
    authProvider: AuthProvider.Google,
    avatar: DEFAULT_CRITTERS_AVATAR_V1,
  },
} satisfies Story

export const AvatarSaveFailure = {
  args: {
    ...Default.args,
    onChangeAvatar: async () => {
      throw new Error('Save failed')
    },
  },
} satisfies Story
