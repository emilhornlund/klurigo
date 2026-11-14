import { createHash } from 'node:crypto'

import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { describe, expect, it, vi } from 'vitest'

import definition from '../../assets/avatars/critters/v1/definition.json'
import originalDefinition from '../../assets/avatars/critters/v1/definition.json?raw'

import {
  getCrittersAvatarV1DataUri,
  renderCrittersAvatarV1,
} from './critters-v1'
import {
  CRITTERS_V1_FIXTURES,
  CRITTERS_V1_REFERENCE,
} from './critters-v1.fixtures'

function documentFor(config: CrittersAvatarConfigurationV1): Document {
  return new DOMParser().parseFromString(
    renderCrittersAvatarV1(config),
    'image/svg+xml',
  )
}

describe('Critters artwork/recipe v1 compatibility', () => {
  it('preserves the original artwork and keeps the shared catalog in sync', () => {
    expect(createHash('sha256').update(originalDefinition).digest('hex')).toBe(
      'df67e34f221589c4949d989996008158d6cdfdcd4149ff92297c51077ca59e9e',
    )
    for (const part of Object.keys(
      CRITTERS_V1_PARTS,
    ) as (keyof typeof CRITTERS_V1_PARTS)[]) {
      expect(Object.keys(definition.components[part].variants).sort()).toEqual(
        [...CRITTERS_V1_PARTS[part]].sort(),
      )
    }
    for (const color of ['body', 'accent', 'background'] as const) {
      expect(definition.colors[color].values).toEqual(CRITTERS_V1_COLORS[color])
    }
    expect(definition.colors.ink.values).toEqual([CRITTERS_V1_COLORS.ink])
    expect(definition.colors.accent.notEqualTo).toEqual(['body'])
  })

  it.each(CRITTERS_V1_FIXTURES)(
    'preserves the complete $name rendering after metadata round-trip',
    ({ configuration }) => {
      const saved: CrittersAvatarConfigurationV1 = JSON.parse(
        JSON.stringify(configuration),
      )
      const svg = renderCrittersAvatarV1(saved)
      expect(svg).toBe(renderCrittersAvatarV1(configuration))
      // Human-readable SVG snapshots intentionally guard geometry, framing, and defaults.
      expect(svg.replaceAll('><', '>\n<')).toMatchSnapshot()
      expect(
        decodeURIComponent(getCrittersAvatarV1DataUri(saved).split(',')[1]),
      ).toBe(svg)
    },
  )

  it('renders every catalog variant explicitly without dropping other selected parts', () => {
    for (const part of Object.keys(
      CRITTERS_V1_PARTS,
    ) as (keyof typeof CRITTERS_V1_PARTS)[]) {
      for (const variant of CRITTERS_V1_PARTS[part]) {
        const config = { ...CRITTERS_V1_REFERENCE, [part]: variant }
        const document = documentFor(config)
        expect(document.querySelector('parsererror')).toBeNull()
        for (const selected of Object.keys(
          CRITTERS_V1_PARTS,
        ) as (keyof typeof CRITTERS_V1_PARTS)[]) {
          expect(
            document.querySelector(`g[id^="${selected}-${config[selected]}-"]`),
          ).not.toBeNull()
        }
      }
    }
  })

  it('honors all eight optional-feature presence combinations', () => {
    for (let mask = 0; mask < 8; mask++) {
      const config = {
        ...CRITTERS_V1_REFERENCE,
        top: mask & 1 ? CRITTERS_V1_REFERENCE.top : null,
        pattern: mask & 2 ? CRITTERS_V1_REFERENCE.pattern : null,
        cheeks: mask & 4 ? CRITTERS_V1_REFERENCE.cheeks : null,
      }
      const document = documentFor(config)
      for (const part of ['top', 'pattern', 'cheeks'] as const) {
        expect(document.querySelector(`g[id^="${part}-"]`) !== null).toBe(
          config[part] !== null,
        )
      }
      expect(document.querySelector('g[id^="body-round-"]')).not.toBeNull()
      expect(document.querySelector('g[id^="eyes-happy-"]')).not.toBeNull()
      expect(document.querySelector('g[id^="mouth-tinySmile-"]')).not.toBeNull()
    }
  })

  it('renders every valid body/accent pair and each background without substitutions', () => {
    for (const bodyColor of CRITTERS_V1_COLORS.body) {
      for (const accentColor of CRITTERS_V1_COLORS.accent) {
        if (bodyColor === accentColor) continue
        const document = documentFor({
          ...CRITTERS_V1_REFERENCE,
          bodyColor,
          accentColor,
        })
        expect(
          document.querySelector(`g[id^="body-"] > path[fill="${bodyColor}"]`),
        ).not.toBeNull()
        expect(
          document.querySelector(`g[id^="top-"] > path[fill="${accentColor}"]`),
        ).not.toBeNull()
      }
    }
    for (const backgroundColor of CRITTERS_V1_COLORS.background) {
      const document = documentFor({
        ...CRITTERS_V1_REFERENCE,
        backgroundColor,
      })
      expect(
        document.querySelector(`rect[fill="${backgroundColor}"]`),
      ).not.toBeNull()
    }
  })

  it('retains latent accent choices in metadata when no visible part uses them', () => {
    const config = { ...CRITTERS_V1_FIXTURES[1].configuration }
    const before = JSON.stringify(config)
    const hidden = renderCrittersAvatarV1(config)
    expect(JSON.stringify(config)).toBe(before)
    expect(hidden).not.toContain(`fill="${config.accentColor}"`)
    const restored = documentFor({ ...config, top: 'horns' })
    expect(
      restored.querySelector(
        `g[id^="top-"] > path[fill="${config.accentColor}"]`,
      ),
    ).not.toBeNull()
  })

  it('imports and renders locally without network, runtime randomness, animation, or external SVG resources', async () => {
    vi.resetModules()
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Avatar rendering must not fetch resources')
    })
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('The v1 recipe must be deterministic')
    })
    try {
      const local = await import('./critters-v1')
      const svg = local.renderCrittersAvatarV1(CRITTERS_V1_REFERENCE)
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(fetch).not.toHaveBeenCalled()
      expect(random).not.toHaveBeenCalled()
      expect(
        document.querySelector(
          'style, animate, image, script, foreignObject, parsererror',
        ),
      ).toBeNull()
      for (const element of document.querySelectorAll('[href]')) {
        expect(element.getAttribute('href')).toMatch(/^#/)
      }
    } finally {
      fetch.mockRestore()
      random.mockRestore()
    }
  })
})
