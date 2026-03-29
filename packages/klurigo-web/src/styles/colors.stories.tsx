import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import colors from './colors.module.scss'

const meta = {
  title: 'Theme/Colors',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllColors: Story = {
  args: {},
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [activeKey, setActiveKey] = useState<string | null>(null)

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'auto auto auto auto',
          gap: 16,
          margin: '0 auto',
          overflowY: 'auto',
        }}>
        {Object.entries(colors)
          .filter(([name]) => !name.includes('_') && !name.includes('control'))
          .map(([name, value]) => {
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveKey(key)
                  }
                }}
                onKeyUp={() => setActiveKey(null)}
                onClick={() => navigator.clipboard.writeText(value)}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'flex-start',
                  minHeight: '200px',
                  padding: '8px',
                  borderRadius: '16px',
                  background: isActive ? 'white' : value,
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
                    columnGap: '8px',
                    background: 'white',
                    color: 'black',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.2)',
                  }}>
                  <span>{name}</span>
                  <span>{value.toUpperCase()}</span>
                </div>
              </button>
            )
          })}
      </div>
    )
  },
}
