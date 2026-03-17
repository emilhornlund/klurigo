import { describe, expect, it } from 'vitest'

import { getCelebrationLevel } from './confetti.utils'

describe('getCelebrationLevel', () => {
  describe('rank-based celebration when no streak is provided', () => {
    it('should return epic for rank 1', () => {
      expect(getCelebrationLevel(1)).toBe('epic')
    })

    it('should return major for rank 2', () => {
      expect(getCelebrationLevel(2)).toBe('major')
    })

    it('should return major for rank 3', () => {
      expect(getCelebrationLevel(3)).toBe('major')
    })

    it('should return normal for rank 4', () => {
      expect(getCelebrationLevel(4)).toBe('normal')
    })

    it('should return normal for rank 10', () => {
      expect(getCelebrationLevel(10)).toBe('normal')
    })

    it('should return none for rank 11', () => {
      expect(getCelebrationLevel(11)).toBe('none')
    })

    it('should return none for ranks greater than 10', () => {
      expect(getCelebrationLevel(25)).toBe('none')
    })
  })

  describe('streak-based celebration', () => {
    it('should return none for streak below 3 when rank does not celebrate', () => {
      expect(getCelebrationLevel(20, 0)).toBe('none')
      expect(getCelebrationLevel(20, 1)).toBe('none')
      expect(getCelebrationLevel(20, 2)).toBe('none')
    })

    it('should return normal for streak 3', () => {
      expect(getCelebrationLevel(20, 3)).toBe('normal')
    })

    it('should return normal for streak 4', () => {
      expect(getCelebrationLevel(20, 4)).toBe('normal')
    })

    it('should return major for streak 5', () => {
      expect(getCelebrationLevel(20, 5)).toBe('major')
    })

    it('should return major for streak 6', () => {
      expect(getCelebrationLevel(20, 6)).toBe('major')
    })

    it('should return epic for streak 7', () => {
      expect(getCelebrationLevel(20, 7)).toBe('epic')
    })

    it('should return epic for streak 9', () => {
      expect(getCelebrationLevel(20, 9)).toBe('epic')
    })

    it('should return epic for streak 10', () => {
      expect(getCelebrationLevel(20, 10)).toBe('epic')
    })

    it('should return epic for streak above 10', () => {
      expect(getCelebrationLevel(20, 15)).toBe('epic')
    })
  })

  describe('correct flag handling', () => {
    it('should return none when correct is false and only rank would celebrate', () => {
      expect(getCelebrationLevel(1, undefined, false)).toBe('none')
      expect(getCelebrationLevel(3, undefined, false)).toBe('none')
      expect(getCelebrationLevel(8, undefined, false)).toBe('none')
    })

    it('should return none when correct is false and streak would celebrate', () => {
      expect(getCelebrationLevel(20, 3, false)).toBe('none')
      expect(getCelebrationLevel(20, 5, false)).toBe('none')
      expect(getCelebrationLevel(20, 10, false)).toBe('none')
    })

    it('should still evaluate normally when correct is true', () => {
      expect(getCelebrationLevel(20, 5, true)).toBe('major')
    })

    it('should still evaluate normally when correct is undefined', () => {
      expect(getCelebrationLevel(20, 5, undefined)).toBe('major')
    })
  })

  describe('combined rank and streak behavior', () => {
    it('should return the rank level when rank is stronger than streak', () => {
      expect(getCelebrationLevel(1, 3)).toBe('epic')
      expect(getCelebrationLevel(2, 3)).toBe('major')
      expect(getCelebrationLevel(3, 4)).toBe('major')
    })

    it('should return the streak level when streak is stronger than rank', () => {
      expect(getCelebrationLevel(10, 5)).toBe('major')
      expect(getCelebrationLevel(10, 7)).toBe('epic')
      expect(getCelebrationLevel(20, 3)).toBe('normal')
    })

    it('should return the shared level when rank and streak resolve to the same level', () => {
      expect(getCelebrationLevel(8, 3)).toBe('normal')
      expect(getCelebrationLevel(2, 5)).toBe('major')
      expect(getCelebrationLevel(1, 10)).toBe('epic')
    })

    it('should prefer rank when streak is none', () => {
      expect(getCelebrationLevel(2, 0)).toBe('major')
      expect(getCelebrationLevel(7, 2)).toBe('normal')
    })

    it('should prefer streak when rank is none', () => {
      expect(getCelebrationLevel(15, 3)).toBe('normal')
      expect(getCelebrationLevel(15, 5)).toBe('major')
      expect(getCelebrationLevel(15, 7)).toBe('epic')
    })
  })

  describe('boundary coverage', () => {
    it('should handle rank boundaries correctly', () => {
      expect(getCelebrationLevel(1)).toBe('epic')
      expect(getCelebrationLevel(2)).toBe('major')
      expect(getCelebrationLevel(3)).toBe('major')
      expect(getCelebrationLevel(4)).toBe('normal')
      expect(getCelebrationLevel(10)).toBe('normal')
      expect(getCelebrationLevel(11)).toBe('none')
    })

    it('should handle streak boundaries correctly', () => {
      expect(getCelebrationLevel(100, 2)).toBe('none')
      expect(getCelebrationLevel(100, 3)).toBe('normal')
      expect(getCelebrationLevel(100, 4)).toBe('normal')
      expect(getCelebrationLevel(100, 5)).toBe('major')
      expect(getCelebrationLevel(100, 6)).toBe('major')
      expect(getCelebrationLevel(100, 7)).toBe('epic')
      expect(getCelebrationLevel(100, 10)).toBe('epic')
    })
  })
})
