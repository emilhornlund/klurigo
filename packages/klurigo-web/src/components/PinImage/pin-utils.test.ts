import { describe, expect, it, vi } from 'vitest'

import { clamp01, getPinColorColor } from './pin-utils'
import { PinColor } from './types'

// Mock the colors module
vi.mock('../../styles/colors.tokens.module.scss', () => ({
  default: {
    colorStatusDanger: '#ff4444',
    colorStatusSuccess: '#44ff44',
    colorStatusWarning: '#ff8844',
    colorActionDefault: '#4444ff',
  },
}))

describe('pin-utils', () => {
  describe('clamp01', () => {
    it('should clamp values greater than 1 to 1', () => {
      expect(clamp01(1.5)).toBe(1)
      expect(clamp01(2.0)).toBe(1)
      expect(clamp01(100)).toBe(1)
      expect(clamp01(1.000001)).toBe(1)
    })

    it('should clamp values less than 0 to 0', () => {
      expect(clamp01(-0.5)).toBe(0)
      expect(clamp01(-1.0)).toBe(0)
      expect(clamp01(-100)).toBe(0)
      expect(clamp01(-0.000001)).toBe(0)
    })

    it('should return values within 0-1 range unchanged', () => {
      expect(clamp01(0)).toBe(0)
      expect(clamp01(1)).toBe(1)
      expect(clamp01(0.5)).toBe(0.5)
      expect(clamp01(0.12345)).toBe(0.12345)
      expect(clamp01(0.99999)).toBe(0.99999)
    })

    it('should round to 5 decimal places', () => {
      expect(clamp01(0.123456789)).toBe(0.12346)
      expect(clamp01(0.999999999)).toBe(1)
      expect(clamp01(0.00001234)).toBe(0.00001)
    })

    it('should handle edge cases with floating point precision', () => {
      expect(clamp01(0.999999999999)).toBe(1)
      expect(clamp01(0.000000000001)).toBe(0)
      expect(clamp01(Number.EPSILON)).toBe(0)
      expect(clamp01(1 - Number.EPSILON)).toBe(1)
    })

    it('should handle special number values', () => {
      expect(clamp01(NaN)).toBeNaN()
      expect(clamp01(Infinity)).toBe(1)
      expect(clamp01(-Infinity)).toBe(0)
    })
  })

  describe('getPinColorColor', () => {
    it('should return red color for PinColor.Red', () => {
      expect(getPinColorColor(PinColor.Red)).toBe('#ff4444')
    })

    it('should return green color for PinColor.Green', () => {
      expect(getPinColorColor(PinColor.Green)).toBe('#44ff44')
    })

    it('should return orange color for PinColor.Orange', () => {
      expect(getPinColorColor(PinColor.Orange)).toBe('#ff8844')
    })

    it('should return blue color for PinColor.Blue', () => {
      expect(getPinColorColor(PinColor.Blue)).toBe('#4444ff')
    })

    it('should return blue color as default for any undefined color', () => {
      // Test with a value that doesn't exist in the enum
      expect(getPinColorColor(999 as PinColor)).toBe('#4444ff')
      expect(getPinColorColor(-1 as PinColor)).toBe('#4444ff')
    })

    it('should handle all enum values correctly', () => {
      const colorMap = {
        [PinColor.Green]: '#44ff44',
        [PinColor.Red]: '#ff4444',
        [PinColor.Blue]: '#4444ff',
        [PinColor.Orange]: '#ff8844',
      }

      Object.entries(colorMap).forEach(([colorEnum, expectedColor]) => {
        expect(getPinColorColor(Number(colorEnum) as PinColor)).toBe(
          expectedColor,
        )
      })
    })

    it('should be consistent with enum order', () => {
      // Test that the function works regardless of enum numeric values
      const colors = [
        getPinColorColor(PinColor.Green),
        getPinColorColor(PinColor.Red),
        getPinColorColor(PinColor.Blue),
        getPinColorColor(PinColor.Orange),
      ]

      expect(colors).toEqual(['#44ff44', '#ff4444', '#4444ff', '#ff8844'])
    })
  })

  describe('integration tests', () => {
    it('should work together in typical usage scenarios', () => {
      // Test typical coordinate clamping scenarios
      const coordinates = [
        { x: -0.1, y: 1.1 },
        { x: 0.5, y: 0.5 },
        { x: 1.2, y: -0.2 },
        { x: 0.123456789, y: 0.987654321 },
      ]

      const expected = [
        { x: 0, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0 },
        { x: 0.12346, y: 0.98765 },
      ]

      coordinates.forEach((coord, index) => {
        expect(clamp01(coord.x)).toBe(expected[index].x)
        expect(clamp01(coord.y)).toBe(expected[index].y)
      })
    })

    it('should handle color selection with clamped coordinates', () => {
      // Simulate a scenario where coordinates are clamped and colors are selected
      const testCases = [
        { x: -0.5, y: 1.5, color: PinColor.Red },
        { x: 0.75, y: 0.25, color: PinColor.Green },
        { x: 1.1, y: -0.1, color: PinColor.Blue },
        { x: 0.5, y: 0.5, color: PinColor.Orange },
      ]

      testCases.forEach((testCase) => {
        const clampedX = clamp01(testCase.x)
        const clampedY = clamp01(testCase.y)
        const color = getPinColorColor(testCase.color)

        expect(clampedX).toBeGreaterThanOrEqual(0)
        expect(clampedX).toBeLessThanOrEqual(1)
        expect(clampedY).toBeGreaterThanOrEqual(0)
        expect(clampedY).toBeLessThanOrEqual(1)
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/) // Valid hex color
      })
    })
  })
})
