import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import colors from './colors.tokens.module.scss'

const meta = {
  title: 'Theme/Colors',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

type ColorToken = {
  name: string
  value: string
}

type ColorSection = {
  title: string
  tokens: ColorToken[]
}

type SemanticSectionConfig = {
  title: string
  prefixes: readonly string[]
}

const paletteOrder = [
  'yellow',
  'orange',
  'red',
  'pink',
  'purple',
  'blue',
  'turquoise',
  'green',
  'gray',
] as const

const semanticSectionConfig: SemanticSectionConfig[] = [
  {
    title: 'Status',
    prefixes: ['colorStatus'],
  },
  {
    title: 'Actions',
    prefixes: ['colorAction'],
  },
  {
    title: 'Text',
    prefixes: ['colorText'],
  },
  {
    title: 'Surfaces',
    prefixes: ['colorSurface'],
  },
  {
    title: 'Borders',
    prefixes: ['colorBorder'],
  },
  {
    title: 'Progress',
    prefixes: ['colorProgress'],
  },
  {
    title: 'Focus',
    prefixes: ['colorFocus'],
  },
  {
    title: 'Shadows',
    prefixes: ['colorShadow'],
  },
  {
    title: 'Insets',
    prefixes: ['colorInset'],
  },
  {
    title: 'Page',
    prefixes: ['colorPage'],
  },
  {
    title: 'Celebration',
    prefixes: ['colorCelebration'],
  },
  {
    title: 'Rating',
    prefixes: ['colorRating'],
  },
  {
    title: 'Loading',
    prefixes: ['colorLoading'],
  },
  {
    title: 'Dropzone',
    prefixes: ['colorDropzone'],
  },
  {
    title: 'Range',
    prefixes: ['colorRange'],
  },
]

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function sortPaletteTokens(tokens: ColorToken[]) {
  return [...tokens].sort((a, b) => {
    const aNumber = Number(a.name.match(/\d+$/)?.[0] ?? 0)
    const bNumber = Number(b.name.match(/\d+$/)?.[0] ?? 0)

    return aNumber - bNumber
  })
}

function sortSemanticTokens(tokens: ColorToken[]) {
  return [...tokens].sort((a, b) => a.name.localeCompare(b.name))
}

function matchesAnyPrefix(name: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => name.startsWith(prefix))
}

function getAllTokens(): ColorToken[] {
  return Object.entries(colors)
    .filter(([, value]) => typeof value === 'string')
    .map(([name, value]) => ({
      name,
      value,
    }))
}

function buildPaletteSections(allTokens: ColorToken[]): ColorSection[] {
  const paletteSections = paletteOrder
    .map((prefix) => {
      const tokens = allTokens.filter(
        (token) => token.name.startsWith(prefix) && /\d+$/.test(token.name),
      )

      return {
        title: `${toTitleCase(prefix)} palette`,
        tokens: sortPaletteTokens(tokens),
      }
    })
    .filter((section) => section.tokens.length > 0)

  const neutralTokens = allTokens.filter(
    (token) => token.name === 'white' || token.name === 'black',
  )

  return [
    ...paletteSections,
    ...(neutralTokens.length > 0
      ? [
          {
            title: 'Neutral palette',
            tokens: sortSemanticTokens(neutralTokens),
          },
        ]
      : []),
  ]
}

function buildSemanticSections(allTokens: ColorToken[]): ColorSection[] {
  const usedNames = new Set<string>()

  const configuredSections = semanticSectionConfig
    .map((section) => {
      const tokens = allTokens.filter((token) => {
        if (!token.name.startsWith('color')) {
          return false
        }

        return matchesAnyPrefix(token.name, section.prefixes)
      })

      tokens.forEach((token) => usedNames.add(token.name))

      return {
        title: section.title,
        tokens: sortSemanticTokens(tokens),
      }
    })
    .filter((section) => section.tokens.length > 0)

  const uncategorizedTokens = allTokens.filter(
    (token) => token.name.startsWith('color') && !usedNames.has(token.name),
  )

  return [
    ...configuredSections,
    ...(uncategorizedTokens.length > 0
      ? [
          {
            title: 'Other semantic tokens',
            tokens: sortSemanticTokens(uncategorizedTokens),
          },
        ]
      : []),
  ]
}

function getLabelBackground(value: string) {
  const normalizedValue = value.toLowerCase().replace(/\s+/g, '')

  if (
    normalizedValue === '#ffffff' ||
    normalizedValue.startsWith('rgba(255,255,255')
  ) {
    return '#f1f2f6'
  }

  return '#ffffff'
}

function getReadableTextColor(value: string) {
  const normalizedValue = value.toLowerCase().replace(/\s+/g, '')

  if (normalizedValue.startsWith('#')) {
    const hex = normalizedValue.slice(1)
    const fullHex =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => char + char)
            .join('')
        : hex

    if (fullHex.length === 6) {
      const red = parseInt(fullHex.slice(0, 2), 16)
      const green = parseInt(fullHex.slice(2, 4), 16)
      const blue = parseInt(fullHex.slice(4, 6), 16)
      const brightness = (red * 299 + green * 587 + blue * 114) / 1000

      return brightness > 150 ? '#000000' : '#ffffff'
    }
  }

  if (normalizedValue.startsWith('rgb')) {
    const matches = normalizedValue.match(/[\d.]+/g)

    if (matches && matches.length >= 3) {
      const [red, green, blue] = matches.slice(0, 3).map(Number)
      const brightness = (red * 299 + green * 587 + blue * 114) / 1000

      return brightness > 150 ? '#000000' : '#ffffff'
    }
  }

  return '#ffffff'
}

function ColorGrid({
  title,
  tokens,
  activeKey,
  setActiveKey,
}: {
  title: string
  tokens: ColorToken[]
  activeKey: string | null
  setActiveKey: (key: string | null) => void
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 24,
          lineHeight: 1.2,
          color: '#ffffff',
        }}>
        {title}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
        {tokens.map(({ name, value }) => {
          const key = `${name}_${value}`
          const isActive = activeKey === key
          const swatchTextColor = getReadableTextColor(value)

          return (
            <button
              key={key}
              onMouseDown={() => setActiveKey(key)}
              onMouseUp={() => setActiveKey(null)}
              onMouseLeave={() => setActiveKey(null)}
              onTouchStart={() => setActiveKey(key)}
              onTouchEnd={() => setActiveKey(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setActiveKey(key)
                }
              }}
              onKeyUp={() => setActiveKey(null)}
              onClick={() => navigator.clipboard.writeText(value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                minHeight: 180,
                padding: 12,
                borderRadius: 16,
                background: isActive ? '#ffffff' : value,
                boxShadow: isActive
                  ? '2px 2px 2px rgba(0, 0, 0, 0.3)'
                  : '4px 4px 4px rgba(0, 0, 0, 0.2)',
                transform: isActive ? 'scale(0.97)' : 'scale(1)',
                transition:
                  'transform 0.05s ease, box-shadow 0.05s ease, background 0.05s ease',
                appearance: 'none',
                outline: 'inherit',
                border: 'none',
                cursor: 'pointer',
                color: swatchTextColor,
                textAlign: 'left',
              }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}>
                {name}
              </span>

              <div
                style={{
                  alignSelf: 'flex-end',
                  display: 'flex',
                  flexDirection: 'row',
                  columnGap: 8,
                  background: getLabelBackground(value),
                  color: '#000000',
                  padding: 8,
                  borderRadius: 8,
                  boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.2)',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                <span>{value.toUpperCase()}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function AllColorsStory() {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const allTokens = getAllTokens()
  const paletteSections = buildPaletteSections(allTokens)
  const semanticSections = buildSemanticSections(allTokens)

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        rowGap: 32,
        background: `linear-gradient(180deg, ${colors.colorPageBackgroundStart} 25%, ${colors.colorPageBackgroundEnd} 75%)`,
      }}>
      {paletteSections.map((section) => (
        <ColorGrid
          key={section.title}
          title={section.title}
          tokens={section.tokens}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
        />
      ))}

      {semanticSections.map((section) => (
        <ColorGrid
          key={section.title}
          title={section.title}
          tokens={section.tokens}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
        />
      ))}
    </div>
  )
}

export const AllColors: Story = {
  render: () => <AllColorsStory />,
}
