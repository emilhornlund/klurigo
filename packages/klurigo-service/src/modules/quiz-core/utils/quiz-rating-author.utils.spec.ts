import { QuizRatingAuthorType } from '@klurigo/common'

import {
  QuizRatingAnonymousAuthorWithBase,
  QuizRatingUserAuthorWithBase,
} from '../repositories/models/schemas'

import {
  isQuizRatingAnonymousAuthor,
  isQuizRatingUserAuthor,
} from './quiz-rating-author.utils'

describe('quiz-rating-author.utils', () => {
  describe('isQuizRatingUserAuthor', () => {
    it('should return true for a user author', () => {
      const author = {
        type: QuizRatingAuthorType.User,
        user: {
          _id: 'user-1',
          defaultNickname: 'Emil',
        },
      } as unknown as QuizRatingUserAuthorWithBase

      expect(isQuizRatingUserAuthor(author)).toBe(true)
    })

    it('should return false for an anonymous author', () => {
      const author = {
        type: QuizRatingAuthorType.Anonymous,
        participantId: 'participant-1',
        nickname: 'Anonymous Player',
      } as QuizRatingAnonymousAuthorWithBase

      expect(isQuizRatingUserAuthor(author)).toBe(false)
    })

    it('should return false when author is undefined', () => {
      expect(isQuizRatingUserAuthor(undefined)).toBe(false)
    })
  })

  describe('isQuizRatingAnonymousAuthor', () => {
    it('should return true for an anonymous author', () => {
      const author = {
        type: QuizRatingAuthorType.Anonymous,
        participantId: 'participant-1',
        nickname: 'Anonymous Player',
      } as QuizRatingAnonymousAuthorWithBase

      expect(isQuizRatingAnonymousAuthor(author)).toBe(true)
    })

    it('should return false for a user author', () => {
      const author = {
        type: QuizRatingAuthorType.User,
        user: {
          _id: 'user-1',
          defaultNickname: 'Emil',
        },
      } as unknown as QuizRatingUserAuthorWithBase

      expect(isQuizRatingAnonymousAuthor(author)).toBe(false)
    })

    it('should return false when author is undefined', () => {
      expect(isQuizRatingAnonymousAuthor(undefined)).toBe(false)
    })
  })
})
