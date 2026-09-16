import { AuthProvider } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import { EmailNotUniqueException, UserNotFoundException } from '../exceptions'

import type { GoogleUser, LocalUser, User } from './models'
import { UserRepository } from './user.repository'

jest.mock('uuid', () => ({
  v4: jest.fn(),
}))

const uuidMock = uuidv4 as unknown as jest.Mock<string, []>

type ModelDouble = {
  findOne: jest.Mock
  findByIdAndUpdate: jest.Mock
}

const makeUser = (overrides: Partial<User> = {}): User => ({
  _id: 'user-1',
  authProvider: AuthProvider.None,
  email: 'user@example.com',
  defaultNickname: 'Player',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

const makeLocalUser = (overrides: Partial<LocalUser> = {}): LocalUser =>
  ({
    ...makeUser({ authProvider: AuthProvider.Local }),
    hashedPassword: 'hashed-password',
    ...overrides,
  }) as LocalUser

const makeGoogleUser = (overrides: Partial<GoogleUser> = {}): GoogleUser =>
  ({
    ...makeUser({ authProvider: AuthProvider.Google }),
    googleUserId: 'google-1',
    ...overrides,
  }) as GoogleUser

describe(UserRepository.name, () => {
  let repository: UserRepository
  let model: ModelDouble
  let findByIdMock: jest.Mock
  let findOneMock: jest.Mock
  let createMock: jest.Mock
  let updateMock: jest.Mock
  let logger: { debug: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    model = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    }
    findByIdMock = jest.fn()
    findOneMock = jest.fn()
    createMock = jest.fn()
    updateMock = jest.fn()
    logger = { debug: jest.fn() }

    repository = Object.create(UserRepository.prototype) as UserRepository
    Object.assign(repository, {
      userModel: model,
      findById: findByIdMock,
      findOne: findOneMock,
      create: createMock,
      update: updateMock,
      logger,
    })
  })

  describe('findUserById and findUserByIdOrThrow', () => {
    it('returns the user from the base repository', async () => {
      const user = makeUser()
      findByIdMock.mockResolvedValueOnce(user)

      await expect(repository.findUserById('user-1')).resolves.toBe(user)
      expect(findByIdMock).toHaveBeenCalledWith('user-1')
    })

    it('throws UserNotFoundException when the user is missing', async () => {
      findByIdMock.mockResolvedValueOnce(null)

      await expect(
        repository.findUserByIdOrThrow('missing'),
      ).rejects.toBeInstanceOf(UserNotFoundException)
      expect(findByIdMock).toHaveBeenCalledWith('missing')
    })
  })

  describe('email normalization', () => {
    it('normalizes the email used for lookup', async () => {
      findOneMock.mockResolvedValueOnce(null)

      await expect(
        repository.findUserByEmail('  USER@Example.COM  '),
      ).resolves.toBeNull()

      expect(findOneMock).toHaveBeenCalledWith({ email: 'user@example.com' })
    })

    it('normalizes both email fields before creating without mutating the input', async () => {
      const details = {
        email: '  USER@Example.COM  ',
        unverifiedEmail: ' Unverified@Example.COM ',
      }
      const created = makeUser()
      createMock.mockResolvedValueOnce(created)

      await expect(repository.createUser(details)).resolves.toBe(created)

      expect(createMock).toHaveBeenCalledWith({
        email: 'user@example.com',
        unverifiedEmail: 'unverified@example.com',
      })
      expect(details).toEqual({
        email: '  USER@Example.COM  ',
        unverifiedEmail: ' Unverified@Example.COM ',
      })
    })

    it('allows an unused normalized email', async () => {
      findOneMock.mockResolvedValueOnce(null)

      await expect(
        repository.verifyUniqueEmail(' User@Example.COM '),
      ).resolves.toBeUndefined()
      expect(findOneMock).toHaveBeenCalledWith({ email: 'user@example.com' })
      expect(logger.debug).not.toHaveBeenCalled()
    })

    it('throws when the normalized email is already used', async () => {
      findOneMock.mockResolvedValueOnce(makeUser())

      await expect(
        repository.verifyUniqueEmail(' USER@Example.COM '),
      ).rejects.toBeInstanceOf(EmailNotUniqueException)
      expect(logger.debug).toHaveBeenCalledWith(
        'User email was not unique: " USER@Example.COM ".',
      )
    })
  })

  describe('provider-specific creation', () => {
    it('creates a local user with a generated id and local discriminator', async () => {
      const created = makeLocalUser({ _id: 'local-1' })
      uuidMock.mockReturnValueOnce('local-1')
      createMock.mockResolvedValueOnce(created)

      await expect(
        repository.createLocalUser({
          email: ' Local@Example.COM ',
          hashedPassword: 'hashed-password',
          defaultNickname: 'Local',
        }),
      ).resolves.toBe(created)

      expect(createMock).toHaveBeenCalledWith({
        _id: 'local-1',
        authProvider: AuthProvider.Local,
        email: 'local@example.com',
        hashedPassword: 'hashed-password',
        defaultNickname: 'Local',
      })
    })

    it('creates a Google user with a generated id and Google discriminator', async () => {
      const created = makeGoogleUser({ _id: 'google-1' })
      uuidMock.mockReturnValueOnce('google-1')
      createMock.mockResolvedValueOnce(created)

      await expect(
        repository.createGoogleUser({
          email: ' Google@Example.COM ',
          googleUserId: 'google-account-1',
          defaultNickname: 'Google',
        }),
      ).resolves.toBe(created)

      expect(createMock).toHaveBeenCalledWith({
        _id: 'google-1',
        authProvider: AuthProvider.Google,
        email: 'google@example.com',
        googleUserId: 'google-account-1',
        defaultNickname: 'Google',
      })
    })
  })

  describe('findUserByIdAndUpdateOrThrow', () => {
    it('throws before updating when the user does not exist', async () => {
      findByIdMock.mockResolvedValueOnce(null)

      await expect(
        repository.findUserByIdAndUpdateOrThrow('missing', {
          email: ' New@Example.COM ',
        }),
      ).rejects.toBeInstanceOf(UserNotFoundException)
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled()
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('uses the normal update path when the discriminator is unchanged', async () => {
      const existing = makeLocalUser()
      const updated = makeLocalUser({ email: 'new@example.com' })
      findByIdMock.mockResolvedValueOnce(existing)
      updateMock.mockResolvedValueOnce(updated)

      await expect(
        repository.findUserByIdAndUpdateOrThrow('user-1', {
          email: ' New@Example.COM ',
          givenName: 'Updated',
        }),
      ).resolves.toBe(updated)

      expect(updateMock).toHaveBeenCalledWith('user-1', {
        email: 'new@example.com',
        givenName: 'Updated',
      })
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled()
    })

    it('uses discriminator overwrite when changing auth providers', async () => {
      const existing = makeLocalUser()
      const updated = makeGoogleUser({ email: 'google@example.com' })
      const execMock = jest.fn().mockResolvedValue(updated)
      findByIdMock.mockResolvedValueOnce(existing)
      model.findByIdAndUpdate.mockReturnValueOnce({ exec: execMock })

      await expect(
        repository.findUserByIdAndUpdateOrThrow('user-1', {
          authProvider: AuthProvider.Google,
          email: ' Google@Example.COM ',
        }),
      ).resolves.toBe(updated)

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        {
          authProvider: AuthProvider.Google,
          email: 'google@example.com',
        },
        {
          returnDocument: 'after',
          overwriteDiscriminatorKey: true,
          runValidators: true,
          context: 'query',
        },
      )
      expect(execMock).toHaveBeenCalledTimes(1)
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('throws when a normal update loses the document', async () => {
      findByIdMock.mockResolvedValueOnce(makeUser())
      updateMock.mockResolvedValueOnce(null)

      await expect(
        repository.findUserByIdAndUpdateOrThrow('user-1', {
          givenName: 'Updated',
        }),
      ).rejects.toBeInstanceOf(UserNotFoundException)
    })
  })

  describe('findAndUpdateGoogleUserByGoogleId', () => {
    it('returns null for a missing or non-Google document', async () => {
      const execMock = jest.fn().mockResolvedValueOnce(makeLocalUser())
      model.findOne.mockReturnValueOnce({ exec: execMock })

      await expect(
        repository.findAndUpdateGoogleUserByGoogleId('google-1', {
          email: 'new@example.com',
        }),
      ).resolves.toBeNull()
      expect(model.findOne).toHaveBeenCalledWith({ googleUserId: 'google-1' })

      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      })
      await expect(
        repository.findAndUpdateGoogleUserByGoogleId('missing', {}),
      ).resolves.toBeNull()
    })

    it('normalizes profile details and returns the saved Google document', async () => {
      const googleUser = makeGoogleUser()
      const updated = makeGoogleUser({ email: 'new@example.com' })
      const setMock = jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValueOnce(updated),
      })
      const execMock = jest.fn().mockResolvedValueOnce(googleUser)
      model.findOne.mockReturnValueOnce({ exec: execMock })
      ;(googleUser as unknown as { set: typeof setMock }).set = setMock

      await expect(
        repository.findAndUpdateGoogleUserByGoogleId('google-1', {
          email: ' New@Example.COM ',
          unverifiedEmail: ' Unverified@Example.COM ',
        }),
      ).resolves.toBe(updated)

      expect(setMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        unverifiedEmail: 'unverified@example.com',
      })
    })

    it('returns null if saving produces a non-Google discriminator', async () => {
      const googleUser = makeGoogleUser()
      const setMock = jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValueOnce(makeLocalUser()),
      })
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(googleUser),
      })
      ;(googleUser as unknown as { set: typeof setMock }).set = setMock

      await expect(
        repository.findAndUpdateGoogleUserByGoogleId('google-1', {}),
      ).resolves.toBeNull()
    })
  })
})
