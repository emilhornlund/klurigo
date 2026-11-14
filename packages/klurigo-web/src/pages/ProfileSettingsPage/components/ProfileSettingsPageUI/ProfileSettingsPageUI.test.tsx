import { AuthProvider } from '@klurigo/common'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ProfileSettingsPageUI from './ProfileSettingsPageUI'

vi.mock('./components/UserAvatarForm', () => ({
  default: () => <section data-testid="avatar-form" />,
}))

describe('ProfileSettingsPageUI', () => {
  it('should render ProfileSettingsPageUI for Local auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Local}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: '',
            unverifiedEmail: undefined,
            givenName: '',
            familyName: '',
            defaultNickname: '',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileSettingsPageUI for Google auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Google}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: '',
            unverifiedEmail: undefined,
            givenName: '',
            familyName: '',
            defaultNickname: '',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileSettingsPageUI with prepopulated values for Local auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Local}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: 'user@example.com',
            unverifiedEmail: undefined,
            givenName: 'John',
            familyName: 'Appleseed',
            defaultNickname: 'FrostyBear',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileSettingsPageUI with prepopulated values for Google auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Google}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: 'user@example.com',
            unverifiedEmail: undefined,
            givenName: 'John',
            familyName: 'Appleseed',
            defaultNickname: 'FrostyBear',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileSettingsPageUI with unverified email for Local auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Local}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: 'user@example.com',
            unverifiedEmail: 'user@example.com',
            givenName: 'John',
            familyName: 'Appleseed',
            defaultNickname: 'FrostyBear',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileSettingsPageUI with unverified email for Google auth provider', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileSettingsPageUI
          authProvider={AuthProvider.Google}
          onChangeAvatar={async (avatar) => avatar}
          values={{
            email: 'user@example.com',
            unverifiedEmail: 'user@example.com',
            givenName: 'John',
            familyName: 'Appleseed',
            defaultNickname: 'FrostyBear',
          }}
          loading={false}
          loadingPassword={false}
          onChange={() => undefined}
          onChangePassword={() => undefined}
          onClickResendVerificationEmail={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })
})
