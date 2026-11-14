import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import {
  faBookOpen,
  faBriefcase,
  faCalculator,
  faChurch,
  faDragon,
  faFilm,
  faFlask,
  faFutbol,
  faGlobe,
  faHeartPulse,
  faLandmark,
  faLaptopCode,
  faLeaf,
  faLightbulb,
  faMasksTheater,
  faMusic,
  faPalette,
  faShapes,
  faShuttleSpace,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QuizCategory } from '@klurigo/common'
import type { FC } from 'react'
import { Link } from 'react-router-dom'

import {
  HorizontalRail,
  RailHeader,
  Typography,
} from '../../../../../../components'
import type { FilterOptions } from '../../../../../../components/QuizTableFilter'
import { QuizCategoryLabels } from '../../../../../../models/labels'
import { discoveryFilterParams } from '../../../../../../utils/useDiscoveryQuizFilters'

import styles from './CategoryBrowser.module.scss'

const CATEGORY_ICONS = {
  [QuizCategory.GeneralKnowledge]: faLightbulb,
  [QuizCategory.Science]: faFlask,
  [QuizCategory.History]: faLandmark,
  [QuizCategory.Geography]: faGlobe,
  [QuizCategory.Entertainment]: faMasksTheater,
  [QuizCategory.Sports]: faFutbol,
  [QuizCategory.Literature]: faBookOpen,
  [QuizCategory.Technology]: faLaptopCode,
  [QuizCategory.Art]: faPalette,
  [QuizCategory.Music]: faMusic,
  [QuizCategory.Film]: faFilm,
  [QuizCategory.FoodAndDrink]: faUtensils,
  [QuizCategory.Politics]: faLandmark,
  [QuizCategory.Mythology]: faDragon,
  [QuizCategory.Nature]: faLeaf,
  [QuizCategory.Business]: faBriefcase,
  [QuizCategory.Health]: faHeartPulse,
  [QuizCategory.Religion]: faChurch,
  [QuizCategory.Space]: faShuttleSpace,
  [QuizCategory.Mathematics]: faCalculator,
  [QuizCategory.Other]: faShapes,
} satisfies Record<QuizCategory, IconDefinition>

export type CategoryBrowserProps = {
  /** Search refinements to preserve when opening a dedicated category page. */
  readonly filter: FilterOptions
}

/** A complete category directory, independent of curated snapshot availability. */
const CategoryBrowser: FC<CategoryBrowserProps> = ({ filter }) => {
  const params = discoveryFilterParams({ ...filter, category: undefined })
  return (
    <section aria-label="Browse by category" className={styles.section}>
      <RailHeader
        title="Browse by category"
        description="Find your next quiz in a subject you love"
      />
      <HorizontalRail>
        {Object.values(QuizCategory).map((category) => {
          return (
            <Link
              key={category}
              onFocus={(event) => {
                // Scrolling on pointer focus can move the link before the click completes.
                if (event.currentTarget.matches(':focus-visible')) {
                  event.currentTarget.scrollIntoView?.({
                    block: 'nearest',
                    inline: 'center',
                  })
                }
              }}
              to={`/discover/category/${category}${params.size ? `?${params}` : ''}`}
              className={styles.tile}>
              <FontAwesomeIcon
                icon={CATEGORY_ICONS[category]}
                className={styles.icon}
              />
              <Typography
                className={styles.label}
                variant="control"
                color="default"
                align="center"
                bold
                noOpacity>
                {QuizCategoryLabels[category]}
              </Typography>
            </Link>
          )
        })}
      </HorizontalRail>
    </section>
  )
}

export default CategoryBrowser
