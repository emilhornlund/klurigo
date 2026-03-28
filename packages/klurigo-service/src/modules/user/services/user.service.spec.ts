import type {
  CreateUserRequestDto,
  UpdateGoogleUserProfileRequestDto,
  UpdateLocalUserProfileRequestDto,
} from '@klurigo/common'
import { AuthProvider } from '@klurigo/common'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'

import type { GoogleProfileDto } from '../../authentication/services/models'
import { BadCredentialsException } from '../exceptions'
import { EmailNotUniqueException } from '../exceptions'

import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let logger: { error: jest.Mock; debug: jest.Mock; log: jest.Mock }

  let userRepository: {
    findUserByEmail: jest.Mock
    verifyUniqueEmail: jest.Mock
    createLocalUser: jest.Mock
    createGoogleUser: jest.Mock
    findAndUpdateGoogleUserByGoogleId: jest.Mock
    findUserByIdOrThrow: jest.Mock
    findUserByIdAndUpdateOrThrow: jest.Mock
  }
  let tokenService: {
    signVerifyEmailToken: jest.Mock
    signPasswordResetToken: jest.Mock
    consumePasswordResetToken: jest.Mock
  }
  let emailService: {
    sendWelcomeEmail: jest.Mock
    sendVerificationEmail: jest.Mock
    sendPasswordResetEmail: jest.Mock
  }
  let configService: { get: jest.Mock }

  beforeEach(() => {
    logger = { error: jest.fn(), debug: jest.fn(), log: jest.fn() }

    userRepository = {
      findUserByEmail: jest.fn(),
      verifyUniqueEmail: jest.fn(),
      createLocalUser: jest.fn(),
      createGoogleUser: jest.fn(),
      findAndUpdateGoogleUserByGoogleId: jest.fn(),
      findUserByIdOrThrow: jest.fn(),
      findUserByIdAndUpdateOrThrow: jest.fn(),
    }

    tokenService = {
      signVerifyEmailToken: jest.fn(),
      signPasswordResetToken: jest.fn(),
      consumePasswordResetToken: jest.fn(),
    }

    emailService = {
      sendWelcomeEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    }

    configService = { get: jest.fn() }

    service = new UserService(
      userRepository as any,
      tokenService as any,
      emailService as any,
      configService as any,
    )
    ;(service as any).logger = logger
  })

  describe('verifyUserCredentialsOrThrow', () => {
    it('should return LocalUser when credentials are valid', async () => {
      const email = 'user@example.com'
      const password = 'correctPassword'
      const hashedPassword = await bcrypt.hash(password, 10)

      const mockUser: any = {
        _id: 'user-123',
        email,
        authProvider: AuthProvider.Local,
        hashedPassword,
      }

      userRepository.findUserByEmail.mockResolvedValue(mockUser)

      const result = await service.verifyUserCredentialsOrThrow(email, password)

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(email)
      expect(result).toEqual(mockUser)
      expect(logger.debug).not.toHaveBeenCalled()
    })

    it('should throw BadCredentialsException when user not found', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null)

      await expect(
        service.verifyUserCredentialsOrThrow('unknown@example.com', 'pass'),
      ).rejects.toBeInstanceOf(BadCredentialsException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      )
    })

    it('should throw BadCredentialsException when password is incorrect', async () => {
      const email = 'user@example.com'
      const correctPassword = 'correctPassword'
      const wrongPassword = 'wrongPassword'
      const hashedPassword = await bcrypt.hash(correctPassword, 10)

      const mockUser: any = {
        _id: 'user-123',
        email,
        authProvider: AuthProvider.Local,
        hashedPassword,
      }

      userRepository.findUserByEmail.mockResolvedValue(mockUser)

      await expect(
        service.verifyUserCredentialsOrThrow(email, wrongPassword),
      ).rejects.toBeInstanceOf(BadCredentialsException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('incorrect password'),
      )
    })

    it('should throw BadCredentialsException when user is Google user', async () => {
      const email = 'user@example.com'
      const password = 'password'

      const mockGoogleUser: any = {
        _id: 'user-123',
        email,
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      userRepository.findUserByEmail.mockResolvedValue(mockGoogleUser)

      await expect(
        service.verifyUserCredentialsOrThrow(email, password),
      ).rejects.toBeInstanceOf(BadCredentialsException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("not 'LOCAL'"),
      )
    })
  })

  describe('createUser', () => {
    const createUserRequest: CreateUserRequestDto = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      givenName: 'John',
      familyName: 'Doe',
      defaultNickname: 'johndoe',
    }

    it('should create user, send welcome email, and return response DTO', async () => {
      const expectedEmail = createUserRequest.email
      const createdUser: any = {
        _id: 'user-new',
        email: expectedEmail,
        unverifiedEmail: expectedEmail,
        givenName: createUserRequest.givenName,
        familyName: createUserRequest.familyName,
        defaultNickname: createUserRequest.defaultNickname,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      userRepository.verifyUniqueEmail.mockResolvedValue(undefined)
      userRepository.createLocalUser.mockResolvedValue(createdUser)
      tokenService.signVerifyEmailToken.mockResolvedValue('verification-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendWelcomeEmail.mockResolvedValue(undefined)

      const result = await service.createUser(createUserRequest)

      expect(userRepository.verifyUniqueEmail).toHaveBeenCalledWith(
        createUserRequest.email,
      )
      expect(userRepository.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expectedEmail,
          unverifiedEmail: expectedEmail,
        }),
      )
      expect(tokenService.signVerifyEmailToken).toHaveBeenCalledWith(
        'user-new',
        expectedEmail,
      )
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        expectedEmail,
        'https://app.example.com/auth/verify?token=verification-token',
      )
      expect(result).toEqual({
        id: 'user-new',
        email: createUserRequest.email,
        unverifiedEmail: createUserRequest.email,
        givenName: createUserRequest.givenName,
        familyName: createUserRequest.familyName,
        defaultNickname: createUserRequest.defaultNickname,
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-01'),
      })
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Created a new user'),
      )
    })

    it('should normalize the email before creating a user', async () => {
      const mixedCaseRequest: CreateUserRequestDto = {
        ...createUserRequest,
        email: '  NewUser@Example.COM  ',
      }

      userRepository.verifyUniqueEmail.mockResolvedValue(undefined)
      userRepository.createLocalUser.mockResolvedValue({
        _id: 'user-new',
        email: 'newuser@example.com',
        unverifiedEmail: 'newuser@example.com',
        givenName: mixedCaseRequest.givenName,
        familyName: mixedCaseRequest.familyName,
        defaultNickname: mixedCaseRequest.defaultNickname,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      })
      tokenService.signVerifyEmailToken.mockResolvedValue('verification-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendWelcomeEmail.mockResolvedValue(undefined)

      await service.createUser(mixedCaseRequest)

      expect(userRepository.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          unverifiedEmail: 'newuser@example.com',
        }),
      )
      expect(tokenService.signVerifyEmailToken).toHaveBeenCalledWith(
        'user-new',
        'newuser@example.com',
      )
    })

    it('should throw ConflictException when email already exists', async () => {
      userRepository.verifyUniqueEmail.mockRejectedValue(
        new EmailNotUniqueException(createUserRequest.email),
      )

      await expect(
        service.createUser(createUserRequest),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('should not rollback user creation when welcome email fails', async () => {
      const createdUser: any = {
        _id: 'user-new',
        email: createUserRequest.email,
        unverifiedEmail: createUserRequest.email,
        givenName: createUserRequest.givenName,
        familyName: createUserRequest.familyName,
        defaultNickname: createUserRequest.defaultNickname,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      userRepository.verifyUniqueEmail.mockResolvedValue(undefined)
      userRepository.createLocalUser.mockResolvedValue(createdUser)
      tokenService.signVerifyEmailToken.mockResolvedValue('verification-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP error'))

      const result = await service.createUser(createUserRequest)

      expect(result.id).toBe('user-new')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send welcome email'),
        expect.any(String),
      )
    })
  })

  describe('verifyOrCreateGoogleUser', () => {
    const googleProfile: GoogleProfileDto = {
      id: 'google-123',
      email: 'googleuser@example.com',
      verified_email: true,
      name: 'Google User',
      given_name: 'Google',
      family_name: 'User',
      picture: 'https://example.com/photo.jpg',
    }

    it('should return existing Google user', async () => {
      const existingGoogleUser: any = {
        _id: 'user-existing',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
        email: googleProfile.email,
        unverifiedEmail: undefined,
        givenName: googleProfile.given_name,
        familyName: googleProfile.family_name,
        defaultNickname: 'existing_nick',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.findAndUpdateGoogleUserByGoogleId.mockResolvedValue(
        existingGoogleUser,
      )
      userRepository.findUserByEmail.mockResolvedValue(existingGoogleUser)

      const result = await service.verifyOrCreateGoogleUser(googleProfile)

      expect(
        userRepository.findAndUpdateGoogleUserByGoogleId,
      ).toHaveBeenCalledWith(
        googleProfile.id,
        expect.objectContaining({
          email: googleProfile.email,
          unverifiedEmail: undefined,
        }),
      )
      expect(result).toEqual(existingGoogleUser)
      expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled()
    })

    it('should create new Google user when not exists and send welcome email', async () => {
      userRepository.findAndUpdateGoogleUserByGoogleId.mockResolvedValue(null)
      userRepository.findUserByEmail.mockResolvedValue(null)

      const newGoogleUser: any = {
        _id: 'user-new-google',
        authProvider: AuthProvider.Google,
        googleUserId: googleProfile.id,
        email: googleProfile.email,
        unverifiedEmail: undefined,
        givenName: googleProfile.given_name,
        familyName: googleProfile.family_name,
        defaultNickname: 'generated_nickname',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.createGoogleUser.mockResolvedValue(newGoogleUser)
      emailService.sendWelcomeEmail.mockResolvedValue(undefined)

      const result = await service.verifyOrCreateGoogleUser(googleProfile)

      expect(userRepository.createGoogleUser).toHaveBeenCalled()
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        googleProfile.email,
      )
      expect(result).toEqual(newGoogleUser)
    })

    it('should normalize Google profile emails before persisting them', async () => {
      const mixedCaseProfile: GoogleProfileDto = {
        ...googleProfile,
        email: '  GoogleUser@Example.COM  ',
        verified_email: false,
      }

      userRepository.findAndUpdateGoogleUserByGoogleId.mockResolvedValue(null)
      userRepository.findUserByEmail.mockResolvedValue(null)
      userRepository.createGoogleUser.mockResolvedValue({
        _id: 'user-new-google',
        authProvider: AuthProvider.Google,
        googleUserId: mixedCaseProfile.id,
        email: 'googleuser@example.com',
        unverifiedEmail: 'googleuser@example.com',
        givenName: mixedCaseProfile.given_name,
        familyName: mixedCaseProfile.family_name,
        defaultNickname: 'generated_nickname',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      emailService.sendWelcomeEmail.mockResolvedValue(undefined)

      await service.verifyOrCreateGoogleUser(mixedCaseProfile)

      expect(
        userRepository.findAndUpdateGoogleUserByGoogleId,
      ).toHaveBeenCalledWith(
        mixedCaseProfile.id,
        expect.objectContaining({
          email: 'googleuser@example.com',
          unverifiedEmail: 'googleuser@example.com',
        }),
      )
      expect(userRepository.createGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'googleuser@example.com',
          unverifiedEmail: 'googleuser@example.com',
        }),
      )
    })

    it('should throw ConflictException when email exists on different user', async () => {
      const existingGoogleUser: any = {
        _id: 'user-existing',
        authProvider: AuthProvider.Local,
        email: googleProfile.email,
      }

      userRepository.findAndUpdateGoogleUserByGoogleId.mockResolvedValue(null)
      userRepository.findUserByEmail.mockResolvedValue(existingGoogleUser)

      await expect(
        service.verifyOrCreateGoogleUser(googleProfile),
      ).rejects.toThrow(ConflictException)
    })

    it('should set unverifiedEmail when email is not verified', async () => {
      const unverifiedProfile: GoogleProfileDto = {
        ...googleProfile,
        verified_email: false,
      }

      userRepository.findAndUpdateGoogleUserByGoogleId.mockResolvedValue(null)
      userRepository.findUserByEmail.mockResolvedValue(null)

      const newGoogleUser: any = {
        _id: 'user-new-unverified',
        authProvider: AuthProvider.Google,
        googleUserId: unverifiedProfile.id,
        email: unverifiedProfile.email,
        unverifiedEmail: unverifiedProfile.email,
        givenName: unverifiedProfile.given_name,
        familyName: unverifiedProfile.family_name,
        defaultNickname: 'nickname',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.createGoogleUser.mockResolvedValue(newGoogleUser)

      const result = await service.verifyOrCreateGoogleUser(unverifiedProfile)

      expect(userRepository.createGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({
          unverifiedEmail: unverifiedProfile.email,
        }),
      )
      expect(result).toEqual(newGoogleUser)
    })
  })

  describe('findUserProfileOrThrow', () => {
    it('should return UserProfileResponseDto', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        authProvider: AuthProvider.Local,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)

      const result = await service.findUserProfileOrThrow('user-123')

      expect(userRepository.findUserByIdOrThrow).toHaveBeenCalledWith(
        'user-123',
      )
      expect(result).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        authProvider: AuthProvider.Local,
        created: mockUser.createdAt,
        updated: mockUser.updatedAt,
      })
    })
  })

  describe('updateUser', () => {
    it('should update local user profile', async () => {
      const originalUser: any = {
        _id: 'user-123',
        email: 'old@example.com',
        unverifiedEmail: undefined,
        givenName: 'Old',
        familyName: 'Name',
        defaultNickname: 'oldnick',
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedUser: any = {
        ...originalUser,
        email: 'new@example.com',
        unverifiedEmail: 'new@example.com',
        givenName: 'New',
        familyName: 'Name',
        defaultNickname: 'newnick',
        hashedPassword: 'some-hash',
      }

      const updateRequest: UpdateLocalUserProfileRequestDto = {
        authProvider: AuthProvider.Local,
        email: 'new@example.com',
        givenName: 'New',
        familyName: 'Name',
        defaultNickname: 'newnick',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(originalUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(updatedUser)
      tokenService.signVerifyEmailToken.mockResolvedValue('verify-token')
      configService.get.mockReturnValue('https://app.example.com')

      const result = await service.updateUser('user-123', updateRequest)

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          givenName: 'New',
          familyName: 'Name',
          defaultNickname: 'newnick',
          unverifiedEmail: 'new@example.com',
        }),
      )
      expect(result.email).toBe('new@example.com')
    })

    it('should update Google user profile with nickname only', async () => {
      const originalUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'oldnick',
        authProvider: AuthProvider.Google,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedUser: any = {
        ...originalUser,
        defaultNickname: 'newnick',
      }

      const updateRequest: UpdateGoogleUserProfileRequestDto = {
        authProvider: AuthProvider.Google,
        defaultNickname: 'newnick',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(originalUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(updatedUser)

      const result = await service.updateUser('user-123', updateRequest)

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          defaultNickname: 'newnick',
        }),
      )
      expect(result.defaultNickname).toBe('newnick')
    })

    it('should send verification email when email changes', async () => {
      const originalUser: any = {
        _id: 'user-123',
        email: 'old@example.com',
        unverifiedEmail: undefined,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        authProvider: AuthProvider.Local,
        createdAt: new Date(),
        updatedAt: new Date(),
        hashedPassword: 'some-hash',
      }

      // updatedUser has different email and unverifiedEmail to trigger sendVerificationEmail
      const updatedUser: any = {
        ...originalUser,
        email: 'old@example.com', // Still the old email in the returned user
        unverifiedEmail: 'new@example.com', // New unverified email
      }

      const updateRequest: UpdateLocalUserProfileRequestDto = {
        authProvider: AuthProvider.Local,
        email: 'new@example.com',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(originalUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(updatedUser)
      tokenService.signVerifyEmailToken.mockResolvedValue('verify-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendVerificationEmail.mockResolvedValue(undefined)

      await service.updateUser('user-123', updateRequest)

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        'https://app.example.com/auth/verify?token=verify-token',
      )
    })

    it('should treat casing-only email updates as unchanged', async () => {
      const originalUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        authProvider: AuthProvider.Local,
        createdAt: new Date(),
        updatedAt: new Date(),
        hashedPassword: 'some-hash',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(originalUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(
        originalUser,
      )

      await service.updateUser('user-123', {
        authProvider: AuthProvider.Local,
        email: '  USER@EXAMPLE.COM  ',
      })

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        expect.not.objectContaining({
          unverifiedEmail: expect.anything(),
        }),
      )
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled()
    })
  })

  describe('verifyEmail', () => {
    it('should clear unverifiedEmail when email matches', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'verified@example.com',
        unverifiedEmail: 'Verify@Example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue({
        ...mockUser,
        unverifiedEmail: undefined,
      })

      await service.verifyEmail('user-123', '  VERIFY@EXAMPLE.COM  ')

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        { unverifiedEmail: undefined },
      )
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Verifying email'),
      )
    })

    it('should throw BadRequestException when email does not match', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'verified@example.com',
        unverifiedEmail: 'verify@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)

      await expect(
        service.verifyEmail('user-123', 'wrong@example.com'),
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('does not match'),
      )
    })

    it('should throw ForbiddenException for non-local users', async () => {
      const mockGoogleUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockGoogleUser)

      await expect(
        service.verifyEmail('user-123', 'user@example.com'),
      ).rejects.toBeInstanceOf(ForbiddenException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not a local account'),
      )
    })
  })

  describe('resendVerificationEmail', () => {
    it('should send verification email for qualified user', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'verified@example.com',
        unverifiedEmail: 'new@example.com',
        authProvider: AuthProvider.Local,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        createdAt: new Date(),
        updatedAt: new Date(),
        hashedPassword: 'some-hash',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)
      tokenService.signVerifyEmailToken.mockResolvedValue('verify-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendVerificationEmail.mockResolvedValue(undefined)

      await service.resendVerificationEmail('user-123')

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        'https://app.example.com/auth/verify?token=verify-token',
      )
    })

    it('should skip non-qualified users silently', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        authProvider: AuthProvider.Local,
        givenName: 'John',
        familyName: 'Doe',
        defaultNickname: 'johndoe',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)

      await service.resendVerificationEmail('user-123')

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not qualified for email verification'),
      )
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send reset email for local user', async () => {
      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: 'hash',
      }

      userRepository.findUserByEmail.mockResolvedValue(mockUser)
      tokenService.signPasswordResetToken.mockResolvedValue('reset-token')
      configService.get.mockReturnValue('https://app.example.com')
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined)

      await service.sendPasswordResetEmail('user@example.com')

      expect(tokenService.signPasswordResetToken).toHaveBeenCalledWith(
        'user-123',
      )
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'https://app.example.com/auth/password/reset?token=reset-token',
      )
    })

    it('should skip non-existent email silently', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null)

      await service.sendPasswordResetEmail('nonexistent@example.com')

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('not qualified for password reset'),
      )
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should skip Google users silently', async () => {
      const mockGoogleUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      userRepository.findUserByEmail.mockResolvedValue(mockGoogleUser)

      await service.sendPasswordResetEmail('user@example.com')

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('not qualified for password reset'),
      )
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })
  })

  describe('changePassword', () => {
    it('should update password when old password is correct', async () => {
      const oldPassword = 'oldPassword'
      const newPassword = 'newPassword'
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10)

      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: hashedOldPassword,
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(mockUser)

      await service.changePassword('user-123', oldPassword, newPassword)

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          hashedPassword: expect.any(String),
        }),
      )
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Updated password'),
      )
    })

    it('should throw BadRequestException when old password is incorrect', async () => {
      const oldPassword = 'wrongPassword'
      const newPassword = 'newPassword'
      const hashedPassword = await bcrypt.hash('correctPassword', 10)

      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword,
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)

      await expect(
        service.changePassword('user-123', oldPassword, newPassword),
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Old password is incorrect'),
      )
    })

    it('should throw ForbiddenException for non-local users', async () => {
      const mockGoogleUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockGoogleUser)

      await expect(
        service.changePassword('user-123', 'old', 'new'),
      ).rejects.toBeInstanceOf(ForbiddenException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not a local account'),
      )
    })
  })

  describe('setPassword', () => {
    it('should set password for local user', async () => {
      const newPassword = 'newPassword'

      const mockUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: 'old-hash',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockUser)
      userRepository.findUserByIdAndUpdateOrThrow.mockResolvedValue(mockUser)
      tokenService.consumePasswordResetToken.mockResolvedValue(undefined)

      await service.setPassword('user-123', newPassword, 'test-jti')

      expect(userRepository.findUserByIdAndUpdateOrThrow).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          hashedPassword: expect.any(String),
        }),
      )
      expect(tokenService.consumePasswordResetToken).toHaveBeenCalledWith(
        'test-jti',
      )
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Updated password'),
      )
    })

    it('should throw ForbiddenException for non-local users', async () => {
      const mockGoogleUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      userRepository.findUserByIdOrThrow.mockResolvedValue(mockGoogleUser)

      await expect(
        service.setPassword('user-123', 'password', 'test-jti'),
      ).rejects.toBeInstanceOf(ForbiddenException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not a local account'),
      )
    })
  })

  describe('computeEmailUpdate (private)', () => {
    it('should return empty object when newEmail is falsy', () => {
      const localUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        authProvider: AuthProvider.Local,
      }

      const result = (service as any).computeEmailUpdate(undefined, localUser)
      expect(result).toEqual({})
    })

    it('should return empty object when email is same', () => {
      const localUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: undefined,
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
      }

      const result = (service as any).computeEmailUpdate(
        'user@example.com',
        localUser,
      )
      expect(result).toEqual({
        email: 'user@example.com',
        unverifiedEmail: undefined,
      })
    })

    it('should set unverifiedEmail when email changes', () => {
      const localUser: any = {
        _id: 'user-123',
        email: 'old@example.com',
        unverifiedEmail: undefined,
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
      }

      const result = (service as any).computeEmailUpdate(
        'new@example.com',
        localUser,
      )
      expect(result).toEqual({ unverifiedEmail: 'new@example.com' })
    })

    it('should clear unverifiedEmail and update email when verified', () => {
      const localUser: any = {
        _id: 'user-123',
        email: 'user@example.com',
        unverifiedEmail: 'verify@example.com',
        authProvider: AuthProvider.Local,
        hashedPassword: 'some-hash',
      }

      const result = (service as any).computeEmailUpdate(
        'user@example.com',
        localUser,
      )
      expect(result).toEqual({
        email: 'user@example.com',
        unverifiedEmail: undefined,
      })
    })

    it('should update email directly for non-local users', () => {
      const googleUser: any = {
        _id: 'user-123',
        email: 'old@example.com',
        authProvider: AuthProvider.Google,
        googleUserId: 'google-123',
      }

      const result = (service as any).computeEmailUpdate(
        'new@example.com',
        googleUser,
      )
      expect(result).toEqual({ email: 'new@example.com' })
    })
  })
})
