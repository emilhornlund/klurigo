import type {
  AnchorHTMLAttributes,
  AriaAttributes,
  AriaRole,
  CSSProperties,
  FC,
  JSX,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from 'react'
import { cloneElement, isValidElement, useCallback, useRef } from 'react'

import { classNames } from '../../utils/helpers'

import { useTextFit } from './hooks'
import styles from './Typography.module.scss'

/**
 * Defines the visual and semantic variants supported by the Typography component.
 *
 * Each variant maps to a specific semantic HTML element and a corresponding
 * visual style defined in the stylesheet.
 */
export type TypographyVariant = 'hero' | 'title' | 'subtitle' | 'text' | 'link'

/**
 * Defines the supported width constraints for the Typography component.
 *
 * These values control the maximum width behavior of the rendered element
 * through CSS modifiers.
 */
export type TypographyWidth = 'small' | 'medium' | 'full'

/**
 * Maps each Typography variant to the semantic HTML element it should render.
 *
 * Semantic rules:
 * - hero     renders as h1 with extra-large visual styling
 * - title    renders as h1 with standard title styling
 * - subtitle renders as h2
 * - text     renders as p
 * - link     renders as a
 *
 * Both hero and title intentionally render as h1. The distinction between them
 * is visual only and does not affect document structure.
 */
const elementByVariant = {
  hero: 'h1',
  title: 'h1',
  subtitle: 'h2',
  text: 'p',
  link: 'a',
} as const satisfies Record<TypographyVariant, keyof JSX.IntrinsicElements>

/**
 * Shared properties supported by all Typography variants.
 *
 * These properties cover layout, interaction, accessibility, and testability
 * concerns that are applicable regardless of the rendered element.
 */
type SharedProps = {
  /**
   * Controls the horizontal width constraint applied to the typography element.
   *
   * Defaults to full width.
   */
  width?: TypographyWidth

  /**
   * Content rendered inside the typography element.
   */
  children: ReactNode

  /**
   * Maximum number of lines allowed before text is shrunk to fit.
   *
   * When provided, enables dynamic font-size adjustment using the useTextFit hook.
   * The Typography component will automatically shrink the font size from the variant's
   * maximum (defined in SCSS) down to a minimum of 12px to fit within the specified lines.
   */
  maxLines?: number

  /**
   * Enables "slot" rendering by delegating the rendered element to the child.
   *
   * When enabled, Typography does not render its own semantic element. Instead,
   * it clones the single React element provided as `children` and applies:
   * - the resolved Typography class names (merged with the child’s className)
   * - any forwarded props (ARIA, data-*, id, event handlers, etc.)
   *
   * This is primarily used to avoid invalid nested markup when composing with
   * components that already render semantic elements (for example, `Link` from
   * `react-router-dom`, which renders an `<a>`).
   *
   * Important:
   * - `children` must be a single valid React element when `asChild` is `true`.
   * - When `asChild` is enabled, Typography’s `variant` only affects styling
   *   and not which element is rendered (the child controls the element).
   */
  asChild?: boolean

  /**
   * Optional additional CSS class names applied to the element.
   */
  className?: string

  /**
   * Optional element identifier.
   */
  id?: string

  /**
   * Advisory title text, typically used for tooltips.
   */
  title?: string

  /**
   * Explicit ARIA role override.
   */
  role?: AriaRole

  /**
   * Tab index for keyboard navigation.
   */
  tabIndex?: number

  /**
   * Click event handler.
   */
  onClick?: MouseEventHandler<HTMLElement>

  /**
   * Keyboard interaction handler.
   */
  onKeyDown?: KeyboardEventHandler<HTMLElement>

  /**
   * Accessible name for assistive technologies.
   */
  'aria-label'?: string

  /**
   * Identifies the element that labels this typography element.
   */
  'aria-labelledby'?: string

  /**
   * Identifies the element that describes this typography element.
   */
  'aria-describedby'?: string

  /**
   * Indicates the politeness level for assistive technology announcements.
   */
  'aria-live'?: AriaAttributes['aria-live']

  /**
   * Indicates whether the element is hidden from assistive technologies.
   */
  'aria-hidden'?: AriaAttributes['aria-hidden']

  /**
   * Custom data attributes for testing, analytics, or instrumentation.
   */
  [dataAttr: `data-${string}`]: string | number | boolean | undefined
}

/**
 * Typography variants that do not render as links.
 */
type NonLinkVariant = Exclude<TypographyVariant, 'link'>

/**
 * Properties for non-link Typography variants.
 *
 * Used for hero, title, subtitle, and text variants.
 */
type NonLinkProps = SharedProps & {
  /**
   * Typography variant excluding link.
   *
   * Defaults to text.
   */
  variant?: NonLinkVariant
}

/**
 * Properties for link Typography variant.
 *
 * Link-specific attributes are only allowed when variant is set to link.
 */
type LinkProps = SharedProps & {
  /**
   * Explicitly identifies this typography element as a link.
   */
  variant: 'link'
} & Pick<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'target' | 'rel' | 'download'
  >

/**
 * Public properties for the Typography component.
 *
 * The allowed properties depend on the selected variant.
 * Link-specific attributes are only permitted when variant is link.
 */
export type TypographyProps = NonLinkProps | LinkProps

/**
 * Typography component for rendering semantic, styled text elements.
 *
 * The component selects the appropriate semantic HTML element based on the
 * provided variant and applies consistent visual styling via CSS modifiers.
 *
 * The Typography component is intentionally not polymorphic. The rendered
 * element is strictly controlled by the variant to preserve semantic clarity
 * and maintain a predictable API.
 */
const Typography: FC<TypographyProps> = (props) => {
  const {
    variant = 'text',
    width = 'full',
    children,
    asChild,
    className,
    maxLines,
    ...rest
  } = props

  const elementRef = useRef<HTMLElement | null>(null)

  const setElementRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node
  }, [])

  // Extract text content for measurement
  const textContent =
    typeof children === 'string'
      ? children
      : typeof children === 'number'
        ? String(children)
        : ''

  // Apply text fitting if maxLines is provided
  // Hook must be called unconditionally (React rules)
  const fittedResult = useTextFit(
    elementRef,
    variant,
    textContent,
    maxLines ?? 0,
  )

  // Create inline style for font-size and line-height override
  // Only apply when text actually needs fitting (fittedResult is not null and values are valid)
  const inlineStyle =
    fittedResult !== null &&
    maxLines &&
    isFinite(fittedResult.fontSize) &&
    isFinite(fittedResult.lineHeight) &&
    fittedResult.fontSize > 0 &&
    fittedResult.lineHeight > 0
      ? ({
          '--fitted-font-size': `${fittedResult.fontSize}px`,
          '--fitted-line-height': `${fittedResult.lineHeight}px`,
          '--max-lines': maxLines,
        } as CSSProperties)
      : undefined

  /**
   * The semantic HTML element to render for the selected variant.
   */
  const Tag = elementByVariant[variant]

  /**
   * Resolved CSS class names for the typography element.
   *
   * Combines base styles, variant styles, size modifiers, and any additional
   * class names provided by the consumer.
   */
  const classes = classNames(
    styles.typography,
    variant === 'hero' ? styles.hero : undefined,
    variant === 'title' ? styles.title : undefined,
    variant === 'subtitle' ? styles.subtitle : undefined,
    variant === 'text' ? styles.text : undefined,
    variant === 'link' ? styles.link : undefined,
    width === 'small' ? styles.widthSmall : undefined,
    width === 'medium' ? styles.widthMedium : undefined,
    width === 'full' ? styles.widthFull : undefined,
    inlineStyle !== undefined ? styles.textFitEnabled : undefined,
    className,
  )

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error(
        'Typography with `asChild` expects a single valid React element as its child.',
      )
    }

    // Only attach ref to intrinsic elements (e.g., 'span', 'div', 'h1').
    const isIntrinsic = typeof children.type === 'string'

    type ChildProps = {
      className?: string
      style?: CSSProperties
    }

    const child = children as ReactElement<ChildProps>

    return cloneElement(child, {
      ...rest,
      ...(isIntrinsic ? { ref: setElementRef } : {}),
      className: classNames(child.props.className, classes),
      style: inlineStyle
        ? { ...child.props.style, ...inlineStyle }
        : child.props.style,
    })
  }

  return (
    <Tag {...rest} ref={setElementRef} className={classes} style={inlineStyle}>
      {children}
    </Tag>
  )
}

export default Typography
