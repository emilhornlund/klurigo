import {
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import { Button, Select, Typography } from '../../components'

import { avatarChoiceLabel } from './avatar-editor.utils'
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
      <Typography variant="title" color="inverse" align="center">
        Critters · local rendering proof
      </Typography>
      <Typography variant="body2" color="inverse" align="center">
        Repository-owned artwork · fixed v1 recipe · static SVG images
      </Typography>
      <section className={styles.preview} aria-label="Reference design preview">
        <img
          src={source}
          width={180}
          height={180}
          alt={`${fixture.name} reference avatar`}
        />
        <div className={styles.controls}>
          <label htmlFor="critter-reference">Reference design</label>
          <Select
            id="critter-reference"
            value={String(selectedIndex)}
            values={CRITTERS_V1_FIXTURES.map(({ name }, index) => ({
              key: name,
              value: String(index),
              valueLabel: name,
            }))}
            onChange={(next) => setSelectedIndex(Number(next))}
          />
          <Button
            id="repeat-avatar-render"
            type="button"
            variant="outline"
            onClick={() => setRepetitions((value) => value + 1)}>
            Repeat identical render
          </Button>
          <output aria-live="polite">Repeated renders: {repetitions}</output>
        </div>
      </section>
      <section aria-label="Small-size legibility">
        <Typography variant="title3" color="inverse">
          Small-size legibility
        </Typography>
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
        <Typography variant="title3" color="inverse">
          Golden reference designs
        </Typography>
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
          <Typography variant="title3" color="inverse">
            {part === 'top' ? 'Head decoration' : avatarChoiceLabel(part)}
          </Typography>
          <div className={styles.grid}>
            {CRITTERS_V1_PARTS[part].map((variant) => (
              <Preview
                key={variant}
                name={avatarChoiceLabel(variant)}
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

/** A named static image used only within the rendering compatibility story. */
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
