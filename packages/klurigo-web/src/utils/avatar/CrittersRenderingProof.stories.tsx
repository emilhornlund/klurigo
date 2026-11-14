import {
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import { getCrittersAvatarV1DataUri } from './critters-v1'
import {
  CRITTERS_V1_FIXTURES,
  CRITTERS_V1_REFERENCE,
} from './critters-v1.fixtures'
import styles from './CrittersRenderingProof.module.scss'

/** Phase 0 laboratory: reference selection, not a player editor or saved profile. */
function CrittersRenderingProof() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [repetitions, setRepetitions] = useState(0)
  const fixture = CRITTERS_V1_FIXTURES[selectedIndex]
  const source = getCrittersAvatarV1DataUri(fixture.configuration)

  return (
    <main className={styles.proof}>
      <h1>Critters · local rendering proof</h1>
      <p>Repository-owned artwork · fixed v1 recipe · static SVG images</p>
      <section className={styles.preview} aria-label="Reference design preview">
        <img
          src={source}
          width={180}
          height={180}
          alt={`${fixture.name} reference avatar`}
        />
        <div className={styles.controls}>
          <label htmlFor="critter-reference">Reference design</label>
          <select
            id="critter-reference"
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}>
            {CRITTERS_V1_FIXTURES.map(({ name }, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRepetitions((value) => value + 1)}>
            Repeat identical render
          </button>
          <output aria-live="polite">Repeated renders: {repetitions}</output>
        </div>
      </section>
      <section aria-label="Small-size legibility">
        <h2>Small-size legibility</h2>
        <div className={styles.sizes}>
          {[24, 32, 48, 64, 96].map((size) => (
            <figure key={size}>
              <img
                src={source}
                width={size}
                height={size}
                alt={`${fixture.name} at ${size} pixels`}
              />
              <figcaption>{size}px</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h2>Golden reference designs</h2>
        <div className={styles.grid}>
          {CRITTERS_V1_FIXTURES.map(({ name, configuration }) => (
            <Preview key={name} name={name} configuration={configuration} />
          ))}
        </div>
      </section>
      {(
        Object.keys(CRITTERS_V1_PARTS) as (keyof typeof CRITTERS_V1_PARTS)[]
      ).map((part) => (
        <section key={part} aria-label={`${part} variants`}>
          <h2>{part}</h2>
          <div className={styles.grid}>
            {CRITTERS_V1_PARTS[part].map((variant) => (
              <Preview
                key={variant}
                name={variant}
                configuration={{ ...CRITTERS_V1_REFERENCE, [part]: variant }}
              />
            ))}
            {(part === 'top' || part === 'pattern' || part === 'cheeks') && (
              <Preview
                name="None"
                configuration={{ ...CRITTERS_V1_REFERENCE, [part]: null }}
              />
            )}
          </div>
        </section>
      ))}
    </main>
  )
}

function Preview({
  name,
  configuration,
}: {
  name: string
  configuration: CrittersAvatarConfigurationV1
}) {
  return (
    <figure>
      <img
        src={getCrittersAvatarV1DataUri(configuration)}
        width={96}
        height={96}
        alt={`${name} avatar`}
        loading="lazy"
      />
      <figcaption>{name}</figcaption>
    </figure>
  )
}

const meta = {
  title: 'Experiments/Avatars/Critters v1',
  component: CrittersRenderingProof,
  decorators: [
    (Story) => (
      <div className={styles.viewport}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CrittersRenderingProof>

export default meta
type Story = StoryObj<typeof meta>

export const LocalRendering = {} satisfies Story
