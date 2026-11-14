import {
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { E2E_FIXTURE_MANIFEST } from '@klurigo/e2e-fixtures'
import { expect, test } from '@playwright/test'

import { authenticatePageThroughApi } from './support/browser/authenticate-page-through-api'
import { E2E_API_BASE_URL } from './support/e2e-runtime'

test.describe('Discovery', () => {
  test('loads every Other category page and recovers a failed next-page request', async ({
    page,
  }) => {
    await authenticatePageThroughApi(
      page,
      E2E_FIXTURE_MANIFEST.users.tester01.email,
    )
    const token = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('auth')!).USER.ACCESS.token as string,
    )
    const quizIds: string[] = []
    try {
      for (let index = 0; index < 45; index++) {
        const response = await page.request.post(
          `${E2E_API_BASE_URL}/quizzes`,
          {
            headers: { Authorization: `Bearer ${token}` },
            data: {
              title: `Other pagination quiz ${index.toString().padStart(2, '0')}`,
              category: QuizCategory.Other,
              visibility: QuizVisibility.Public,
              mode: GameMode.Classic,
              languageCode: LanguageCode.English,
              questions: [
                {
                  type: QuestionType.TrueFalse,
                  question: 'The Earth orbits the Sun.',
                  correct: true,
                  points: 1000,
                  duration: 30,
                },
              ],
            },
          },
        )
        expect(response.ok(), await response.text()).toBeTruthy()
        quizIds.push((await response.json()).id)
      }
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/discover/category/OTHER')
      const grid = page.getByTestId('category-quiz-grid')
      await expect(grid.getByTestId('quiz-discovery-card')).toHaveCount(20)
      let failNextPage = true
      await page.route('**/klurigo-service/api/quizzes?**', async (route) => {
        if (
          failNextPage &&
          new URL(route.request().url()).searchParams.get('offset') === '20'
        ) {
          // Fail the first next-page action, including automatic request retries.
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Temporarily unavailable' }),
          })
        } else {
          await route.continue()
        }
      })
      await page.getByRole('button', { name: 'Load more quizzes' }).click()
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'We couldn’t load more quizzes' }),
      ).toBeVisible({ timeout: 15_000 })
      await expect(grid.getByTestId('quiz-discovery-card')).toHaveCount(20)
      failNextPage = false
      await page.getByRole('button', { name: 'Try loading more again' }).click()
      await expect(grid.getByTestId('quiz-discovery-card')).toHaveCount(40)
      await page.getByRole('button', { name: 'Load more quizzes' }).click()
      await expect(grid.getByTestId('quiz-discovery-card')).toHaveCount(45)
      await expect(
        page.getByRole('button', { name: 'Load more quizzes' }),
      ).toHaveCount(0)
      const titles = await grid
        .getByTestId('quiz-discovery-card')
        .allTextContents()
      expect(new Set(titles).size).toBe(45)
    } finally {
      for (const id of quizIds) {
        await page.request.delete(`${E2E_API_BASE_URL}/quizzes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    }
  })

  test('keeps every category accessible on narrow screens and opens a dedicated page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await authenticatePageThroughApi(
      page,
      E2E_FIXTURE_MANIFEST.users.tester01.email,
    )
    await page.goto('/discover')
    const browser = page.getByRole('region', { name: 'Browse by category' })
    const selected = browser.getByRole('link', {
      name: 'Mathematics',
      exact: true,
    })
    const dimensions = await browser.getByRole('link').evaluateAll((links) =>
      links.map((link) => {
        const { width, height } = link.getBoundingClientRect()
        return `${width}x${height}`
      }),
    )
    expect(new Set(dimensions).size).toBe(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320)
    await selected.focus()
    await page.keyboard.press('Tab')
    const other = browser.getByRole('link', { name: 'Other', exact: true })
    await expect(other).toBeFocused()
    await expect(other).toBeInViewport({ ratio: 1 })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/discover/category/OTHER')
    await expect(
      page.getByRole('heading', { name: 'Other quizzes' }),
    ).toBeVisible()
    await expect(browser).toHaveCount(0)
    await page.getByRole('link', { name: 'Back to discovery' }).click()
    await expect(page).toHaveURL('/discover')
  })

  test('browses categories, refines results, and preserves selection through details, Back, and reload', async ({
    page,
  }) => {
    await authenticatePageThroughApi(
      page,
      E2E_FIXTURE_MANIFEST.users.tester01.email,
    )
    const token = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('auth')!).USER.ACCESS.token as string,
    )
    const response = await page.request.post(`${E2E_API_BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Discover category science quiz',
        mode: GameMode.Classic,
        visibility: QuizVisibility.Public,
        category: QuizCategory.Science,
        languageCode: LanguageCode.English,
        questions: [
          {
            type: QuestionType.TrueFalse,
            question: 'The Earth orbits the Sun.',
            correct: true,
            points: 1000,
            duration: 30,
          },
        ],
      },
    })
    expect(response.ok(), await response.text()).toBeTruthy()
    const quiz = await response.json()
    try {
      await page.goto('/discover')
      const browser = page.getByRole('region', { name: 'Browse by category' })
      await expect(browser.getByRole('link')).toHaveCount(21)
      await browser.getByRole('link', { name: 'Science', exact: true }).click()
      await expect(page).toHaveURL('/discover/category/SCIENCE')
      await expect(
        page.getByRole('heading', { name: 'Science quizzes' }),
      ).toBeVisible()
      await expect(browser).toHaveCount(0)
      await page
        .getByTestId('test-search-textfield-textfield')
        .fill('Discover category science')
      await page.getByRole('button', { name: 'Search quizzes' }).click()
      await expect(page).toHaveURL(
        '/discover/category/SCIENCE?search=Discover+category+science',
      )
      await page
        .getByTestId('quiz-discovery-card')
        .filter({ hasText: quiz.title })
        .click()
      await expect(page).toHaveURL(`/quiz/details/${quiz.id}`)
      await page.goBack()
      await expect(
        page.getByRole('heading', { name: 'Science quizzes' }),
      ).toBeVisible()
      await page.reload()
      await expect(
        page.getByTestId('test-search-textfield-textfield'),
      ).toHaveValue('Discover category science')
      await expect(
        page.getByTestId('quiz-discovery-card').filter({ hasText: quiz.title }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Clear filters' }).click()
      await expect(page).toHaveURL('/discover/category/SCIENCE')
      await page.getByRole('link', { name: 'Back to discovery' }).click()
      await expect(page).toHaveURL('/discover')
      await browser.getByRole('link', { name: 'History', exact: true }).click()
      await expect(page.getByTestId('category-empty-state')).toContainText(
        'No public quizzes in History yet',
      )
      await page.goBack()
      await expect(page).toHaveURL('/discover')
    } finally {
      await page.request.delete(`${E2E_API_BASE_URL}/quizzes/${quiz.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  })

  test('/discover renders the discovery rails page after login', async ({
    page,
  }) => {
    await page.goto('/auth/login')

    await page
      .getByTestId('test-email-textfield')
      .fill(E2E_FIXTURE_MANIFEST.users.tester01.email)
    await page
      .getByTestId('test-password-textfield')
      .fill(E2E_FIXTURE_MANIFEST.password)

    const loginButton = page.getByTestId('test-login-button')
    await expect(loginButton).toBeEnabled()
    await loginButton.click()

    await expect(page).toHaveURL('/')

    await page.goto('/discover')
    await expect(page).toHaveURL('/discover')

    const heading = page.getByRole('heading', { name: 'Discover' })
    await expect(heading).toBeVisible()
  })

  test('/discover/rails no longer exists', async ({ page }) => {
    await page.goto('/discover/rails')

    const errorHeading = page.getByText('Oops! Something went wrong.')
    await expect(errorHeading).toBeVisible()
  })
})
