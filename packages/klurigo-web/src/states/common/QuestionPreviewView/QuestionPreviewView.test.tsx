import { GameMode, QuestionType } from '@klurigo/common'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../../utils/device-size.types'
import * as deviceHook from '../../../utils/useDeviceSizeType'

import QuestionPreviewView from './QuestionPreviewView'

const resizeObservers: { trigger: () => void }[] = []

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObservers.push({
      trigger: () => this.callback([], this as unknown as ResizeObserver),
    })
  }

  observe() {}
  disconnect() {}
}

describe('QuestionPreviewView', () => {
  it.each([
    [QuestionType.MultiChoice, 'Multiple choice'],
    [QuestionType.Range, 'Range'],
    [QuestionType.TrueFalse, 'True or false'],
    [QuestionType.TypeAnswer, 'Type answer'],
    [QuestionType.Pin, 'Pin'],
    [QuestionType.Puzzle, 'Puzzle'],
  ])('renders the %s type metadata', (questionType, label) => {
    render(
      <QuestionPreviewView
        mode={GameMode.Classic}
        questionType={questionType}
        question="A preview question"
      />,
    )

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText('A preview question')).toBeInTheDocument()
  })

  it.each([
    [0, 'Zero Points'],
    [1000, 'Standard Points'],
    [2000, 'Double Points'],
  ])('renders the %s point label when points are provided', (points, label) => {
    render(
      <QuestionPreviewView
        mode={GameMode.Classic}
        questionType={QuestionType.MultiChoice}
        question="Question"
        questionPoints={points}
      />,
    )

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders type metadata without a points label when points are optional', () => {
    render(
      <QuestionPreviewView
        mode={GameMode.Classic}
        questionType={QuestionType.TypeAnswer}
        question="Question"
      />,
    )

    expect(screen.getByText('Type answer')).toBeInTheDocument()
    expect(screen.getByTestId('question-preview-metadata')).toBeInTheDocument()
    expect(screen.queryByText(/Points/)).not.toBeInTheDocument()
  })

  it('uses the full preview area without classic metadata in other modes', () => {
    render(
      <QuestionPreviewView
        mode={GameMode.ZeroToOneHundred}
        questionType={QuestionType.Range}
        question="Question without metadata"
        questionPoints={1000}
      />,
    )

    expect(screen.getByTestId('question-preview-view')).toContainElement(
      screen.getByText('Question without metadata'),
    )
    expect(
      screen.queryByTestId('question-preview-metadata'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Range')).not.toBeInTheDocument()
    expect(screen.queryByText('Standard Points')).not.toBeInTheDocument()
  })

  it('layers metadata over the full-height scrolling question viewport', () => {
    render(
      <QuestionPreviewView
        mode={GameMode.Classic}
        questionType={QuestionType.MultiChoice}
        question={'A long question '.repeat(30)}
        questionPoints={1000}
      />,
    )

    const preview = screen.getByTestId('question-preview-view')
    const metadata = screen.getByTestId('question-preview-metadata')
    const scrollingViewport = preview.querySelector('[class*="questionText"]')

    expect(scrollingViewport).toBeInTheDocument()
    expect(preview).toContainElement(metadata)
    expect(preview).toContainElement(scrollingViewport as HTMLElement)
    expect(screen.getByText(/A long question/)).toBeInTheDocument()
  })

  it.each([
    [DeviceType.Mobile, 70, 64],
    [DeviceType.Tablet, 95, 96],
    [DeviceType.Desktop, 110, 128],
  ])(
    'preserves the %s scroll speed and loop gap',
    async (deviceType, speed, gap) => {
      resizeObservers.length = 0
      let rafCallback: ((time: number) => void) | undefined
      vi.stubGlobal(
        'ResizeObserver',
        ResizeObserverMock as unknown as typeof ResizeObserver,
      )
      vi.stubGlobal('performance', { now: () => 0 } as unknown as Performance)
      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: (time: number) => void) => {
          rafCallback = callback
          return 1
        },
      )
      vi.stubGlobal('cancelAnimationFrame', () => {})
      vi.spyOn(deviceHook, 'useDeviceSizeType').mockReturnValue(deviceType)

      const { container } = render(
        <QuestionPreviewView
          mode={GameMode.Classic}
          questionType={QuestionType.MultiChoice}
          question={'A long question '.repeat(30)}
        />,
      )
      const viewport = container.querySelector(
        '[class*="questionText"]',
      ) as HTMLElement
      const track = viewport.firstElementChild as HTMLElement
      const firstBlock = track.firstElementChild as HTMLElement
      Object.defineProperty(viewport, 'clientHeight', { value: 100 })
      Object.defineProperty(firstBlock, 'offsetHeight', { value: 400 })

      await act(async () => resizeObservers.forEach(({ trigger }) => trigger()))
      await act(async () => {
        rafCallback?.(0)
        rafCallback?.(1000)
      })

      expect(track.style.transform).toBe(`translateY(-${speed}px)`)
      expect((track.children[1] as HTMLElement).style.height).toBe(`${gap}px`)

      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    },
  )
})
