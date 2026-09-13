import type {
  AuthLoginRequestDto,
  AuthRefreshRequestDto,
  AuthResponseDto,
  TokenDto,
} from '@klurigo/common'
import { Authority, TokenScope } from '@klurigo/common'
import { UnauthorizedException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { AuthService } from './auth.service'
import { USER_LOGIN_EVENT_KEY } from './utils'

jest.mock('murlock', () => ({
  MurLock:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}))

describe('AuthService', () => {
  let service: AuthService
  let eventEmitter: EventEmitter2
  let logger: { error: jest.Mock; debug: jest.Mock }

  let userService: {
    verifyUserCredentialsOrThrow: jest.Mock
    verifyOrCreateGoogleUser: jest.Mock
  }
  let tokenService: {
    signTokenPair: jest.Mock
    verifyToken: jest.Mock
    tokenExistsOrThrow: jest.Mock
    revoke: jest.Mock
  }
  let googleAuthService: {
    exchangeCodeForAccessToken: jest.Mock
    fetchGoogleProfile: jest.Mock
  }

  beforeEach(() => {
    eventEmitter = new EventEmitter2()
    logger = { error: jest.fn(), debug: jest.fn() }

    userService = {
      verifyUserCredentialsOrThrow: jest.fn(),
      verifyOrCreateGoogleUser: jest.fn(),
    }

    tokenService = {
      signTokenPair: jest.fn(),
      verifyToken: jest.fn(),
      tokenExistsOrThrow: jest.fn(),
      revoke: jest.fn(),
    }

    googleAuthService = {
      exchangeCodeForAccessToken: jest.fn(),
      fetchGoogleProfile: jest.fn(),
    }

    service = new AuthService(
      userService as any,
      tokenService as any,
      eventEmitter,
      googleAuthService as any,
    )
    ;(service as any).logger = logger
  })

  describe('emitUserLoginEvent', () => {
    it('should emit a UserLoginEvent with correct payload', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      await (service as any).emitUserLoginEvent('user-123')

      expect(emitSpy).toHaveBeenCalledWith(
        USER_LOGIN_EVENT_KEY,
        expect.objectContaining({
          userId: 'user-123',
          date: expect.any(Date),
        }),
      )
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should catch and log errors thrown by eventEmitter.emit', async () => {
      jest.spyOn(eventEmitter, 'emit').mockImplementation(() => {
        throw new Error('boom happened')
      })

      await (service as any).emitUserLoginEvent('user-456')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to emit user login event for userId 'user-456': 'boom happened.'`,
        ),
        expect.any(String),
      )
    })
  })

  describe('login', () => {
    it('should verify credentials, sign token pair, emit login event, and return token pair', async () => {
      const request: AuthLoginRequestDto = {
        email: 'user@example.com',
        password: 'secret',
      } as any

      userService.verifyUserCredentialsOrThrow.mockResolvedValue({ _id: 'u-1' })

      const tokenPair: AuthResponseDto = {
        accessToken: 'access',
        refreshToken: 'refresh',
      } as any
      tokenService.signTokenPair.mockResolvedValue(tokenPair)

      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      const result = await service.login(request, '1.2.3.4', 'UA')

      expect(userService.verifyUserCredentialsOrThrow).toHaveBeenCalledWith(
        'user@example.com',
        'secret',
      )
      expect(tokenService.signTokenPair).toHaveBeenCalledWith(
        'u-1',
        TokenScope.User,
        '1.2.3.4',
        'UA',
      )

      expect(emitSpy).toHaveBeenCalledWith(
        USER_LOGIN_EVENT_KEY,
        expect.objectContaining({ userId: 'u-1', date: expect.any(Date) }),
      )

      expect(result).toBe(tokenPair)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should propagate errors from verifyUserCredentialsOrThrow', async () => {
      userService.verifyUserCredentialsOrThrow.mockRejectedValue(
        new Error('bad creds'),
      )

      await expect(
        service.login(
          { email: 'user@example.com', password: 'secret' } as any,
          '1.2.3.4',
          'UA',
        ),
      ).rejects.toThrow('bad creds')
    })

    it('should propagate errors from signTokenPair', async () => {
      userService.verifyUserCredentialsOrThrow.mockResolvedValue({ _id: 'u-1' })
      tokenService.signTokenPair.mockRejectedValue(new Error('sign failed'))

      await expect(
        service.login(
          { email: 'user@example.com', password: 'secret' } as any,
          '1.2.3.4',
          'UA',
        ),
      ).rejects.toThrow('sign failed')
    })

    it('should still return token pair even if emitting login event fails (error logged)', async () => {
      userService.verifyUserCredentialsOrThrow.mockResolvedValue({ _id: 'u-1' })

      const tokenPair: AuthResponseDto = {
        accessToken: 'access',
        refreshToken: 'refresh',
      } as any
      tokenService.signTokenPair.mockResolvedValue(tokenPair)

      jest.spyOn(eventEmitter, 'emit').mockImplementation(() => {
        throw new Error('emit failed')
      })

      const result = await service.login(
        { email: 'user@example.com', password: 'secret' } as any,
        '1.2.3.4',
        'UA',
      )

      expect(result).toBe(tokenPair)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to emit user login event for userId 'u-1': 'emit failed.'`,
        ),
        expect.any(String),
      )
    })
  })

  describe('loginGoogle', () => {
    it('should exchange code, fetch profile, verify/create user, sign token pair, emit login event, and return token pair', async () => {
      googleAuthService.exchangeCodeForAccessToken.mockResolvedValue('ga-token')
      googleAuthService.fetchGoogleProfile.mockResolvedValue({
        sub: 'google-sub',
      })
      userService.verifyOrCreateGoogleUser.mockResolvedValue({ _id: 'u-gg' })

      const tokenPair: AuthResponseDto = {
        accessToken: 'access',
        refreshToken: 'refresh',
      } as any
      tokenService.signTokenPair.mockResolvedValue(tokenPair)

      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      const result = await service.loginGoogle(
        'code',
        'verifier',
        '1.2.3.4',
        'UA',
      )

      expect(googleAuthService.exchangeCodeForAccessToken).toHaveBeenCalledWith(
        'code',
        'verifier',
      )
      expect(googleAuthService.fetchGoogleProfile).toHaveBeenCalledWith(
        'ga-token',
      )
      expect(userService.verifyOrCreateGoogleUser).toHaveBeenCalledWith(
        expect.any(Object),
      )

      expect(tokenService.signTokenPair).toHaveBeenCalledWith(
        'u-gg',
        TokenScope.User,
        '1.2.3.4',
        'UA',
      )

      expect(emitSpy).toHaveBeenCalledWith(
        USER_LOGIN_EVENT_KEY,
        expect.objectContaining({ userId: 'u-gg', date: expect.any(Date) }),
      )

      expect(result).toBe(tokenPair)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should propagate errors from exchangeCodeForAccessToken', async () => {
      googleAuthService.exchangeCodeForAccessToken.mockRejectedValue(
        new Error('oauth fail'),
      )

      await expect(
        service.loginGoogle('code', 'verifier', '1.2.3.4', 'UA'),
      ).rejects.toThrow('oauth fail')
    })
  })

  describe('refresh', () => {
    const ip = '1.2.3.4'
    const ua = 'UA'

    it('should throw UnauthorizedException if verifyToken fails (and logs debug)', async () => {
      tokenService.verifyToken.mockRejectedValue(new Error('invalid token'))

      await expect(
        service.refresh(
          { refreshToken: 'rt' } as AuthRefreshRequestDto,
          ip,
          ua,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to verify refresh token: 'invalid token'.`,
        ),
        expect.any(String),
      )
      expect(tokenService.revoke).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if tokenExistsOrThrow fails (and logs debug)', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [Authority.RefreshAuth],
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockRejectedValue(
        new Error('missing in store'),
      )

      await expect(
        service.refresh({ refreshToken: 'rt' } as any, ip, ua),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          `Unable to retrieve existing refresh token: 'missing in store'.`,
        ),
        expect.any(String),
      )
      expect(tokenService.revoke).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if missing RefreshAuth authority (and logs debug)', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [],
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockResolvedValue(undefined)

      await expect(
        service.refresh({ refreshToken: 'rt' } as any, ip, ua),
      ).rejects.toBeInstanceOf(UnauthorizedException)

      expect(logger.debug).toHaveBeenCalledWith(
        `Failed to refresh token since missing '${Authority.RefreshAuth}' authority.`,
      )
      expect(tokenService.revoke).not.toHaveBeenCalled()
    })

    it('should refresh a User-scoped token and emit login event', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [Authority.RefreshAuth],
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockResolvedValue(undefined)

      const tokenPair: AuthResponseDto = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      } as any
      tokenService.signTokenPair.mockResolvedValue(tokenPair)

      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      const result = await service.refresh(
        { refreshToken: 'rt' } as any,
        ip,
        ua,
      )

      expect(logger.debug).toHaveBeenCalledWith(
        `Refreshing token with userId 'u-1'.`,
      )
      expect(tokenService.signTokenPair).toHaveBeenCalledWith(
        'u-1',
        TokenScope.User,
        ip,
        ua,
        {},
      )
      expect(tokenService.revoke).toHaveBeenCalledWith('rt')

      expect(emitSpy).toHaveBeenCalledWith(
        USER_LOGIN_EVENT_KEY,
        expect.objectContaining({ userId: 'u-1', date: expect.any(Date) }),
      )
      expect(result).toBe(tokenPair)
    })

    it('should refresh a Game-scoped token, include additional claims, and not emit login event', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.Game,
        authorities: [Authority.RefreshAuth],
        gameId: 'g-1',
        participantType: 'Player',
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockResolvedValue(undefined)

      const tokenPair: AuthResponseDto = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      } as any
      tokenService.signTokenPair.mockResolvedValue(tokenPair)

      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      const result = await service.refresh(
        { refreshToken: 'rt' } as any,
        ip,
        ua,
      )

      expect(tokenService.signTokenPair).toHaveBeenCalledWith(
        'u-1',
        TokenScope.Game,
        ip,
        ua,
        { gameId: 'g-1', participantType: 'Player' },
      )
      expect(tokenService.revoke).toHaveBeenCalledWith('rt')

      expect(emitSpy).not.toHaveBeenCalled()
      expect(result).toBe(tokenPair)
    })

    it('should not revoke the supplied token if issuing the replacement pair fails', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [Authority.RefreshAuth],
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockResolvedValue(undefined)
      tokenService.signTokenPair.mockRejectedValue(new Error('sign failed'))

      await expect(
        service.refresh({ refreshToken: 'rt' } as any, ip, ua),
      ).rejects.toThrow('sign failed')

      expect(tokenService.revoke).not.toHaveBeenCalled()
    })

    it('should fail the refresh if revoking the supplied token fails', async () => {
      const payload: TokenDto = {
        sub: 'u-1',
        jti: 'jti-1',
        scope: TokenScope.User,
        authorities: [Authority.RefreshAuth],
      } as any

      tokenService.verifyToken.mockResolvedValue(payload)
      tokenService.tokenExistsOrThrow.mockResolvedValue(undefined)
      tokenService.signTokenPair.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      })
      tokenService.revoke.mockRejectedValue(new Error('revoke failed'))
      const emitSpy = jest.spyOn(eventEmitter, 'emit')

      await expect(
        service.refresh({ refreshToken: 'rt' } as any, ip, ua),
      ).rejects.toThrow('revoke failed')

      expect(emitSpy).not.toHaveBeenCalled()
    })
  })
})
