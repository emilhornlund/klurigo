import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import legacyColors from './colors.module.scss'
import paletteColors from './colors.tokens.module.scss'

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

const legacySections: Array<{
  title: string
  tokens: ColorToken[]
}> = [
  {
    title: 'Blue',
    tokens: [
      { name: 'blue1', value: legacyColors.blue1 },
      { name: 'blue2', value: legacyColors.blue2 },
    ],
  },
  {
    title: 'Yellow',
    tokens: [
      { name: 'yellow1', value: legacyColors.yellow1 },
      { name: 'yellow2', value: legacyColors.yellow2 },
    ],
  },
  {
    title: 'Pink',
    tokens: [
      { name: 'pink1', value: legacyColors.pink1 },
      { name: 'pink2', value: legacyColors.pink2 },
    ],
  },
  {
    title: 'Red',
    tokens: [
      { name: 'red1', value: legacyColors.red1 },
      { name: 'red2', value: legacyColors.red2 },
    ],
  },
  {
    title: 'Orange',
    tokens: [
      { name: 'orange1', value: legacyColors.orange1 },
      { name: 'orange2', value: legacyColors.orange2 },
    ],
  },
  {
    title: 'Green',
    tokens: [
      { name: 'green1', value: legacyColors.green1 },
      { name: 'green2', value: legacyColors.green2 },
      { name: 'green2_25', value: legacyColors.green2_25 },
    ],
  },
  {
    title: 'Turquoise',
    tokens: [
      { name: 'turquoise1', value: legacyColors.turquoise1 },
      { name: 'turquoise2', value: legacyColors.turquoise2 },
    ],
  },
  {
    title: 'Gray',
    tokens: [
      { name: 'gray1', value: legacyColors.gray1 },
      { name: 'gray2', value: legacyColors.gray2 },
      { name: 'gray3', value: legacyColors.gray3 },
      { name: 'gray4', value: legacyColors.gray4 },
    ],
  },
  {
    title: 'White',
    tokens: [
      { name: 'white', value: legacyColors.white },
      { name: 'white1_15', value: legacyColors.white1_15 },
      { name: 'white1_20', value: legacyColors.white1_20 },
      { name: 'white1_25', value: legacyColors.white1_25 },
      { name: 'white1_30', value: legacyColors.white1_30 },
      { name: 'white1_40', value: legacyColors.white1_40 },
      { name: 'white1_50', value: legacyColors.white1_50 },
      { name: 'white1_70', value: legacyColors.white1_70 },
      { name: 'white1_80', value: legacyColors.white1_80 },
    ],
  },
  {
    title: 'Black',
    tokens: [
      { name: 'black1', value: legacyColors.black1 },
      { name: 'black1_10', value: legacyColors.black1_10 },
      { name: 'black1_15', value: legacyColors.black1_15 },
      { name: 'black1_50', value: legacyColors.black1_50 },
      { name: 'black1_70', value: legacyColors.black1_70 },
      { name: 'black1_75', value: legacyColors.black1_75 },
      { name: 'black1_80', value: legacyColors.black1_80 },
    ],
  },
  {
    title: 'Medals',
    tokens: [
      { name: 'gold', value: legacyColors.gold },
      { name: 'silver', value: legacyColors.silver },
      { name: 'bronze', value: legacyColors.bronze },
    ],
  },
  {
    title: 'Primary controls',
    tokens: [
      {
        name: 'controlPrimaryNormalColor',
        value: legacyColors.controlPrimaryNormalColor,
      },
      {
        name: 'controlPrimarySuccessColor',
        value: legacyColors.controlPrimarySuccessColor,
      },
      {
        name: 'controlPrimaryCallToActionColor',
        value: legacyColors.controlPrimaryCallToActionColor,
      },
      {
        name: 'controlPrimaryDangerColor',
        value: legacyColors.controlPrimaryDangerColor,
      },
    ],
  },
  {
    title: 'Secondary controls',
    tokens: [
      {
        name: 'controlSecondaryNormalColor',
        value: legacyColors.controlSecondaryNormalColor,
      },
      {
        name: 'controlSecondarySuccessColor',
        value: legacyColors.controlSecondarySuccessColor,
      },
      {
        name: 'controlSecondaryDangerColor',
        value: legacyColors.controlSecondaryDangerColor,
      },
    ],
  },
  {
    title: 'Text controls',
    tokens: [
      {
        name: 'controlTextNormalColor',
        value: legacyColors.controlTextNormalColor,
      },
      {
        name: 'controlTextContrastColor',
        value: legacyColors.controlTextContrastColor,
      },
      {
        name: 'controlTextSuccessColor',
        value: legacyColors.controlTextSuccessColor,
      },
      {
        name: 'controlTextDangerColor',
        value: legacyColors.controlTextDangerColor,
      },
    ],
  },
  {
    title: 'Disabled controls',
    tokens: [
      {
        name: 'controlPrimaryDisabledColor',
        value: legacyColors.controlPrimaryDisabledColor,
      },
      {
        name: 'controlTextDisabledColor',
        value: legacyColors.controlTextDisabledColor,
      },
    ],
  },
]

const paletteSections: Array<{
  title: string
  tokens: ColorToken[]
}> = [
  {
    title: 'Yellow palette',
    tokens: [
      { name: 'yellow50', value: paletteColors.yellow50 },
      { name: 'yellow100', value: paletteColors.yellow100 },
      { name: 'yellow200', value: paletteColors.yellow200 },
      { name: 'yellow300', value: paletteColors.yellow300 },
      { name: 'yellow400', value: paletteColors.yellow400 },
      { name: 'yellow500', value: paletteColors.yellow500 },
      { name: 'yellow600', value: paletteColors.yellow600 },
      { name: 'yellow700', value: paletteColors.yellow700 },
      { name: 'yellow800', value: paletteColors.yellow800 },
      { name: 'yellow900', value: paletteColors.yellow900 },
    ],
  },
  {
    title: 'Orange palette',
    tokens: [
      { name: 'orange50', value: paletteColors.orange50 },
      { name: 'orange100', value: paletteColors.orange100 },
      { name: 'orange200', value: paletteColors.orange200 },
      { name: 'orange300', value: paletteColors.orange300 },
      { name: 'orange400', value: paletteColors.orange400 },
      { name: 'orange500', value: paletteColors.orange500 },
      { name: 'orange600', value: paletteColors.orange600 },
      { name: 'orange700', value: paletteColors.orange700 },
      { name: 'orange800', value: paletteColors.orange800 },
      { name: 'orange900', value: paletteColors.orange900 },
    ],
  },
  {
    title: 'Red palette',
    tokens: [
      { name: 'red50', value: paletteColors.red50 },
      { name: 'red100', value: paletteColors.red100 },
      { name: 'red200', value: paletteColors.red200 },
      { name: 'red300', value: paletteColors.red300 },
      { name: 'red400', value: paletteColors.red400 },
      { name: 'red500', value: paletteColors.red500 },
      { name: 'red600', value: paletteColors.red600 },
      { name: 'red700', value: paletteColors.red700 },
      { name: 'red800', value: paletteColors.red800 },
      { name: 'red900', value: paletteColors.red900 },
    ],
  },
  {
    title: 'Pink palette',
    tokens: [
      { name: 'pink50', value: paletteColors.pink50 },
      { name: 'pink100', value: paletteColors.pink100 },
      { name: 'pink200', value: paletteColors.pink200 },
      { name: 'pink300', value: paletteColors.pink300 },
      { name: 'pink400', value: paletteColors.pink400 },
      { name: 'pink500', value: paletteColors.pink500 },
      { name: 'pink600', value: paletteColors.pink600 },
      { name: 'pink700', value: paletteColors.pink700 },
      { name: 'pink800', value: paletteColors.pink800 },
      { name: 'pink900', value: paletteColors.pink900 },
    ],
  },
  {
    title: 'Purple palette',
    tokens: [
      { name: 'purple50', value: paletteColors.purple50 },
      { name: 'purple100', value: paletteColors.purple100 },
      { name: 'purple200', value: paletteColors.purple200 },
      { name: 'purple300', value: paletteColors.purple300 },
      { name: 'purple400', value: paletteColors.purple400 },
      { name: 'purple500', value: paletteColors.purple500 },
      { name: 'purple600', value: paletteColors.purple600 },
      { name: 'purple700', value: paletteColors.purple700 },
      { name: 'purple800', value: paletteColors.purple800 },
      { name: 'purple900', value: paletteColors.purple900 },
    ],
  },
  {
    title: 'Blue palette',
    tokens: [
      { name: 'blue50', value: paletteColors.blue50 },
      { name: 'blue100', value: paletteColors.blue100 },
      { name: 'blue200', value: paletteColors.blue200 },
      { name: 'blue300', value: paletteColors.blue300 },
      { name: 'blue400', value: paletteColors.blue400 },
      { name: 'blue500', value: paletteColors.blue500 },
      { name: 'blue600', value: paletteColors.blue600 },
      { name: 'blue700', value: paletteColors.blue700 },
      { name: 'blue800', value: paletteColors.blue800 },
      { name: 'blue900', value: paletteColors.blue900 },
    ],
  },
  {
    title: 'Turquoise palette',
    tokens: [
      { name: 'turquoise50', value: paletteColors.turquoise50 },
      { name: 'turquoise100', value: paletteColors.turquoise100 },
      { name: 'turquoise200', value: paletteColors.turquoise200 },
      { name: 'turquoise300', value: paletteColors.turquoise300 },
      { name: 'turquoise400', value: paletteColors.turquoise400 },
      { name: 'turquoise500', value: paletteColors.turquoise500 },
      { name: 'turquoise600', value: paletteColors.turquoise600 },
      { name: 'turquoise700', value: paletteColors.turquoise700 },
      { name: 'turquoise800', value: paletteColors.turquoise800 },
      { name: 'turquoise900', value: paletteColors.turquoise900 },
    ],
  },
  {
    title: 'Green palette',
    tokens: [
      { name: 'green50', value: paletteColors.green50 },
      { name: 'green100', value: paletteColors.green100 },
      { name: 'green200', value: paletteColors.green200 },
      { name: 'green300', value: paletteColors.green300 },
      { name: 'green400', value: paletteColors.green400 },
      { name: 'green500', value: paletteColors.green500 },
      { name: 'green600', value: paletteColors.green600 },
      { name: 'green700', value: paletteColors.green700 },
      { name: 'green800', value: paletteColors.green800 },
      { name: 'green900', value: paletteColors.green900 },
    ],
  },
  {
    title: 'Gray palette',
    tokens: [
      { name: 'gray50', value: paletteColors.gray50 },
      { name: 'gray100', value: paletteColors.gray100 },
      { name: 'gray200', value: paletteColors.gray200 },
      { name: 'gray300', value: paletteColors.gray300 },
      { name: 'gray400', value: paletteColors.gray400 },
      { name: 'gray500', value: paletteColors.gray500 },
      { name: 'gray600', value: paletteColors.gray600 },
      { name: 'gray700', value: paletteColors.gray700 },
      { name: 'gray800', value: paletteColors.gray800 },
      { name: 'gray900', value: paletteColors.gray900 },
    ],
  },
  {
    title: 'Neutral palette',
    tokens: [
      { name: 'white', value: paletteColors.white },
      { name: 'black', value: paletteColors.black },
    ],
  },
]

function getLabelBackground(value: string) {
  const normalizedValue = value.toLowerCase()

  if (
    normalizedValue === '#ffffff' ||
    normalizedValue.startsWith('rgba(255, 255, 255')
  ) {
    return '#f1f2f6'
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
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
        }}>
        {tokens.map(({ name, value }) => {
          const key = `${name}_${value}`
          const isActive = activeKey === key

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
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                minHeight: 180,
                padding: 8,
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
                color: 'inherit',
                border: 'none',
                cursor: 'pointer',
              }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  columnGap: 8,
                  background: getLabelBackground(value),
                  color: '#000000',
                  padding: 8,
                  borderRadius: 8,
                  boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.2)',
                }}>
                <span>{name}</span>
                <span>{value.toUpperCase()}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export const AllColors: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [activeKey, setActiveKey] = useState<string | null>(null)

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          rowGap: 32,
          background: `linear-gradient(180deg, ${paletteColors.blue400} 25%, ${paletteColors.blue600} 75%)`,
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
      </div>
    )
  },
}

export const LegacyColors: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [activeKey, setActiveKey] = useState<string | null>(null)

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          rowGap: 32,
          background: `linear-gradient(180deg, ${legacyColors.blue1} 25%, ${legacyColors.blue2} 75%)`,
        }}>
        {legacySections.map((section) => (
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
  },
}
