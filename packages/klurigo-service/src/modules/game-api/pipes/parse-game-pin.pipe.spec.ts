import { BadRequestException } from '@nestjs/common'

import { ParseGamePINPipe } from './parse-game-pin.pipe'

describe('ParseGamePINPipe', () => {
  let pipe: ParseGamePINPipe

  beforeEach(() => {
    pipe = new ParseGamePINPipe()
  })

  it('should be defined', () => {
    expect(pipe).toBeDefined()
  })

  describe('Valid PINs', () => {
    it('should allow a valid 6-digit PIN within range', () => {
      const validPIN = '123456'
      expect(pipe.transform(validPIN, {} as any)).toBe(validPIN)
    })

    it('should allow the minimum valid 6-digit PIN (100000)', () => {
      const minValidPIN = '100000'
      expect(pipe.transform(minValidPIN, {} as any)).toBe(minValidPIN)
    })

    it('should allow the maximum valid 6-digit PIN (999999)', () => {
      const maxValidPIN = '999999'
      expect(pipe.transform(maxValidPIN, {} as any)).toBe(maxValidPIN)
    })
  })

  describe('Invalid PINs', () => {
    it('should throw BadRequestException for a PIN shorter than 6 digits', () => {
      const shortPIN = '12345'
      expect(() => pipe.transform(shortPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a PIN longer than 6 digits', () => {
      const longPIN = '1234567'
      expect(() => pipe.transform(longPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a PIN with non-numeric characters', () => {
      const alphaPIN = '12345a'
      expect(() => pipe.transform(alphaPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a PIN starting with 0', () => {
      const zeroStartPIN = '012345'
      expect(() => pipe.transform(zeroStartPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a PIN with special characters', () => {
      const specialCharPIN = '1234@6'
      expect(() => pipe.transform(specialCharPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })
  })

  describe('Edge Cases', () => {
    it('should throw BadRequestException for an empty string', () => {
      const emptyPIN = ''
      expect(() => pipe.transform(emptyPIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a PIN containing only spaces', () => {
      const spacePIN = '      '
      expect(() => pipe.transform(spacePIN, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a numeric PIN value', () => {
      expect(() => pipe.transform(123456 as any, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for a null value', () => {
      expect(() => pipe.transform(null as any, {} as any)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for an undefined value', () => {
      expect(() => pipe.transform(undefined as any, {} as any)).toThrow(
        BadRequestException,
      )
    })
  })
})
