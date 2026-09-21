import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import type { Meta, StoryObj } from '@storybook/react'

import Button from './Button'

const meta = {
  title: 'Inputs/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    id: 'my-button',
    type: 'button',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

const groupStyle = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
} as const

const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
} as const

const storyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
} as const

const brandSurfaceStyle = {
  border: '1px solid white',
  borderRadius: '0.75rem',
  padding: '2rem',
} as const

const lightSurfaceStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dfe4ea',
  borderRadius: '0.75rem',
  padding: '2rem',
  color: 'black',
} as const

const variants = ['primary', 'outline', 'plain'] as const
const intents = ['default', 'accent', 'danger', 'success'] as const

export const Playground = {
  args: {
    variant: 'primary',
    surface: 'brand',
    intent: 'default',
    size: 'normal',
    value: 'Button',
  },
} satisfies Story

export const BrandSurface = {
  render: () => (
    <div style={brandSurfaceStyle}>
      <div style={storyStyle}>
        {intents.map((intent) => (
          <div key={intent} style={columnStyle}>
            <strong>{intent}</strong>

            <div style={groupStyle}>
              {variants.map((variant) => (
                <Button
                  key={variant}
                  id={`brand-${intent}-${variant}`}
                  type="button"
                  surface="brand"
                  intent={intent}
                  variant={variant}
                  value={variant}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
} satisfies Story

export const LightSurface = {
  render: () => (
    <div style={lightSurfaceStyle}>
      <div style={storyStyle}>
        {intents.map((intent) => (
          <div key={intent} style={columnStyle}>
            <strong>{intent}</strong>

            <div style={groupStyle}>
              {variants.map((variant) => (
                <Button
                  key={variant}
                  id={`light-${intent}-${variant}`}
                  type="button"
                  surface="light"
                  intent={intent}
                  variant={variant}
                  value={variant}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
} satisfies Story

export const Sizes = {
  render: () => (
    <div style={groupStyle}>
      <Button
        id="normal-button"
        type="button"
        surface="brand"
        variant="primary"
        value="Normal"
      />

      <Button
        id="small-button"
        type="button"
        surface="brand"
        variant="primary"
        size="small"
        value="Small"
      />
    </div>
  ),
} satisfies Story

export const Icons = {
  render: () => (
    <div style={groupStyle}>
      <Button
        id="leading-icon-button"
        type="button"
        surface="brand"
        variant="primary"
        value="Previous"
        icon={faArrowLeft}
        iconPosition="leading"
      />

      <Button
        id="trailing-icon-button"
        type="button"
        surface="light"
        variant="primary"
        value="Next"
        icon={faArrowRight}
        iconPosition="trailing"
      />

      <Button
        id="icon-only-button"
        type="button"
        surface="brand"
        variant="plain"
        icon={faArrowLeft}
      />
    </div>
  ),
} satisfies Story

export const Disabled = {
  render: () => (
    <div style={storyStyle}>
      <div style={brandSurfaceStyle}>
        <div style={groupStyle}>
          {variants.map((variant) => (
            <Button
              key={variant}
              id={`brand-disabled-${variant}`}
              type="button"
              surface="brand"
              variant={variant}
              value={variant}
              disabled
            />
          ))}
        </div>
      </div>

      <div style={lightSurfaceStyle}>
        <div style={groupStyle}>
          {variants.map((variant) => (
            <Button
              key={variant}
              id={`light-disabled-${variant}`}
              type="button"
              surface="light"
              variant={variant}
              value={variant}
              disabled
            />
          ))}
        </div>
      </div>
    </div>
  ),
} satisfies Story

export const Loading = {
  render: () => (
    <div style={storyStyle}>
      <div style={brandSurfaceStyle}>
        <div style={groupStyle}>
          {variants.map((variant) => (
            <Button
              key={variant}
              id={`brand-loading-${variant}`}
              type="button"
              surface="brand"
              variant={variant}
              value={variant}
              loading
            />
          ))}
        </div>
      </div>

      <div style={lightSurfaceStyle}>
        <div style={groupStyle}>
          {variants.map((variant) => (
            <Button
              key={variant}
              id={`light-loading-${variant}`}
              type="button"
              surface="light"
              variant={variant}
              value={variant}
              loading
            />
          ))}
        </div>
      </div>
    </div>
  ),
} satisfies Story

export const EqualWidthActions = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
      <Button
        id="grow-first-button"
        type="button"
        surface="light"
        variant="outline"
        value="Cancel"
        grow
      />

      <Button
        id="grow-second-button"
        type="button"
        surface="light"
        intent="danger"
        variant="primary"
        value="Delete"
        grow
      />
    </div>
  ),
} satisfies Story
