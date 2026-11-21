import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC, type ReactNode, useId, useState } from 'react'

import Surface from '../Surface'
import Typography from '../Typography'

import styles from './Accordion.module.scss'

export type AccordionProps = {
  readonly title: string
  readonly description?: string
  readonly icon?: IconDefinition
  readonly headingLevel?: 2 | 3 | 4 | 5 | 6
  readonly defaultExpanded?: boolean
  readonly children: ReactNode
}

/** A standalone disclosure panel for any content that can be tucked away. */
const Accordion: FC<AccordionProps> = ({
  title,
  description,
  icon,
  headingLevel = 2,
  defaultExpanded = false,
  children,
}) => {
  const id = useId()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const Heading = `h${headingLevel}` as const

  return (
    <Surface
      as="section"
      className={styles.panel}
      aria-labelledby={`${id}-title`}>
      <Heading className={styles.heading}>
        <button
          type="button"
          className={styles.trigger}
          aria-labelledby={`${id}-title`}
          aria-describedby={description ? `${id}-description` : undefined}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((current) => !current)}>
          {icon && (
            <span className={styles.iconTile} aria-hidden="true">
              <FontAwesomeIcon icon={icon} />
            </span>
          )}
          <span className={styles.label}>
            <Typography asChild variant="title4" color="inverse" noOpacity>
              <span id={`${id}-title`}>{title}</span>
            </Typography>
            {description && (
              <Typography asChild variant="control2" color="inverse" noOpacity>
                <span id={`${id}-description`}>{description}</span>
              </Typography>
            )}
          </span>
          <span className={styles.indicator} aria-hidden="true">
            <FontAwesomeIcon icon={faChevronDown} className={styles.chevron} />
          </span>
        </button>
      </Heading>

      <div id={`${id}-content`} className={styles.content} hidden={!expanded}>
        {children}
      </div>
    </Surface>
  )
}

export default Accordion
