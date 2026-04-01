import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import legacyColors from './colors.module.scss'
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
      { name: 'yellow50', value: colors.yellow50 },
      { name: 'yellow100', value: colors.yellow100 },
      { name: 'yellow200', value: colors.yellow200 },
      { name: 'yellow300', value: colors.yellow300 },
      { name: 'yellow400', value: colors.yellow400 },
      { name: 'yellow500', value: colors.yellow500 },
      { name: 'yellow600', value: colors.yellow600 },
      { name: 'yellow700', value: colors.yellow700 },
      { name: 'yellow800', value: colors.yellow800 },
      { name: 'yellow900', value: colors.yellow900 },
    ],
  },
  {
    title: 'Orange palette',
    tokens: [
      { name: 'orange50', value: colors.orange50 },
      { name: 'orange100', value: colors.orange100 },
      { name: 'orange200', value: colors.orange200 },
      { name: 'orange300', value: colors.orange300 },
      { name: 'orange400', value: colors.orange400 },
      { name: 'orange500', value: colors.orange500 },
      { name: 'orange600', value: colors.orange600 },
      { name: 'orange700', value: colors.orange700 },
      { name: 'orange800', value: colors.orange800 },
      { name: 'orange900', value: colors.orange900 },
    ],
  },
  {
    title: 'Red palette',
    tokens: [
      { name: 'red50', value: colors.red50 },
      { name: 'red100', value: colors.red100 },
      { name: 'red200', value: colors.red200 },
      { name: 'red300', value: colors.red300 },
      { name: 'red400', value: colors.red400 },
      { name: 'red500', value: colors.red500 },
      { name: 'red600', value: colors.red600 },
      { name: 'red700', value: colors.red700 },
      { name: 'red800', value: colors.red800 },
      { name: 'red900', value: colors.red900 },
    ],
  },
  {
    title: 'Pink palette',
    tokens: [
      { name: 'pink50', value: colors.pink50 },
      { name: 'pink100', value: colors.pink100 },
      { name: 'pink200', value: colors.pink200 },
      { name: 'pink300', value: colors.pink300 },
      { name: 'pink400', value: colors.pink400 },
      { name: 'pink500', value: colors.pink500 },
      { name: 'pink600', value: colors.pink600 },
      { name: 'pink700', value: colors.pink700 },
      { name: 'pink800', value: colors.pink800 },
      { name: 'pink900', value: colors.pink900 },
    ],
  },
  {
    title: 'Purple palette',
    tokens: [
      { name: 'purple50', value: colors.purple50 },
      { name: 'purple100', value: colors.purple100 },
      { name: 'purple200', value: colors.purple200 },
      { name: 'purple300', value: colors.purple300 },
      { name: 'purple400', value: colors.purple400 },
      { name: 'purple500', value: colors.purple500 },
      { name: 'purple600', value: colors.purple600 },
      { name: 'purple700', value: colors.purple700 },
      { name: 'purple800', value: colors.purple800 },
      { name: 'purple900', value: colors.purple900 },
    ],
  },
  {
    title: 'Blue palette',
    tokens: [
      { name: 'blue50', value: colors.blue50 },
      { name: 'blue100', value: colors.blue100 },
      { name: 'blue200', value: colors.blue200 },
      { name: 'blue300', value: colors.blue300 },
      { name: 'blue400', value: colors.blue400 },
      { name: 'blue500', value: colors.blue500 },
      { name: 'blue600', value: colors.blue600 },
      { name: 'blue700', value: colors.blue700 },
      { name: 'blue800', value: colors.blue800 },
      { name: 'blue900', value: colors.blue900 },
    ],
  },
  {
    title: 'Turquoise palette',
    tokens: [
      { name: 'turquoise50', value: colors.turquoise50 },
      { name: 'turquoise100', value: colors.turquoise100 },
      { name: 'turquoise200', value: colors.turquoise200 },
      { name: 'turquoise300', value: colors.turquoise300 },
      { name: 'turquoise400', value: colors.turquoise400 },
      { name: 'turquoise500', value: colors.turquoise500 },
      { name: 'turquoise600', value: colors.turquoise600 },
      { name: 'turquoise700', value: colors.turquoise700 },
      { name: 'turquoise800', value: colors.turquoise800 },
      { name: 'turquoise900', value: colors.turquoise900 },
    ],
  },
  {
    title: 'Green palette',
    tokens: [
      { name: 'green50', value: colors.green50 },
      { name: 'green100', value: colors.green100 },
      { name: 'green200', value: colors.green200 },
      { name: 'green300', value: colors.green300 },
      { name: 'green400', value: colors.green400 },
      { name: 'green500', value: colors.green500 },
      { name: 'green600', value: colors.green600 },
      { name: 'green700', value: colors.green700 },
      { name: 'green800', value: colors.green800 },
      { name: 'green900', value: colors.green900 },
    ],
  },
  {
    title: 'Gray palette',
    tokens: [
      { name: 'gray50', value: colors.gray50 },
      { name: 'gray100', value: colors.gray100 },
      { name: 'gray200', value: colors.gray200 },
      { name: 'gray300', value: colors.gray300 },
      { name: 'gray400', value: colors.gray400 },
      { name: 'gray500', value: colors.gray500 },
      { name: 'gray600', value: colors.gray600 },
      { name: 'gray700', value: colors.gray700 },
      { name: 'gray800', value: colors.gray800 },
      { name: 'gray900', value: colors.gray900 },
    ],
  },
  {
    title: 'Neutral palette',
    tokens: [
      { name: 'white', value: colors.white },
      { name: 'black', value: colors.black },
    ],
  },
]

const semanticSections: Array<{
  title: string
  tokens: ColorToken[]
}> = [
  {
    title: 'Status',
    tokens: [
      { name: 'colorSuccess', value: colors.colorSuccess },
      { name: 'colorDanger', value: colors.colorDanger },
      { name: 'colorWarning', value: colors.colorWarning },
      { name: 'colorInfo', value: colors.colorInfo },
    ],
  },
  {
    title: 'Text',
    tokens: [
      { name: 'colorTextPrimary', value: colors.colorTextPrimary },
      { name: 'colorTextSecondary', value: colors.colorTextSecondary },
      { name: 'colorTextMuted', value: colors.colorTextMuted },
      { name: 'colorTextDisabled', value: colors.colorTextDisabled },
      { name: 'colorTextInverse', value: colors.colorTextInverse },
      { name: 'colorTextOnSubtle', value: colors.colorTextOnSubtle },
      { name: 'colorTextSuccess', value: colors.colorTextSuccess },
      { name: 'colorTextDanger', value: colors.colorTextDanger },
    ],
  },
  {
    title: 'Surfaces',
    tokens: [
      { name: 'colorSurfacePageStart', value: colors.colorSurfacePageStart },
      { name: 'colorSurfacePageEnd', value: colors.colorSurfacePageEnd },
      { name: 'colorSurfaceGlassStart', value: colors.colorSurfaceGlassStart },
      { name: 'colorSurfaceGlassEnd', value: colors.colorSurfaceGlassEnd },
      {
        name: 'colorSurfaceGlassHoverStart',
        value: colors.colorSurfaceGlassHoverStart,
      },
      {
        name: 'colorSurfaceGlassHoverEnd',
        value: colors.colorSurfaceGlassHoverEnd,
      },
      {
        name: 'colorSurfaceGlassActiveStart',
        value: colors.colorSurfaceGlassActiveStart,
      },
      {
        name: 'colorSurfaceGlassActiveEnd',
        value: colors.colorSurfaceGlassActiveEnd,
      },
    ],
  },
  {
    title: 'Borders',
    tokens: [
      { name: 'colorBorderGlass', value: colors.colorBorderGlass },
      { name: 'colorBorderGlassHover', value: colors.colorBorderGlassHover },
      { name: 'colorBorderGlassActive', value: colors.colorBorderGlassActive },
    ],
  },
  {
    title: 'Focus',
    tokens: [{ name: 'colorFocusRing', value: colors.colorFocusRing }],
  },
  {
    title: 'Status',
    tokens: [
      { name: 'colorRating', value: colors.colorRating },
      { name: 'colorRatingHover', value: colors.colorRatingHover },
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
          background: `linear-gradient(180deg, ${colors.blue400} 25%, ${colors.blue600} 75%)`,
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
