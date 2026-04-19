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
export type TypographyVariant =
  | 'extraLargeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'title4'
  | 'title5'
  | 'body'
  | 'body2'
  | 'control'
  | 'control2'
  | 'link'
  | 'link2'

/**
 * Defines the supported text alignment options for the Typography component.
 */
export type TypographyAlign = 'center' | 'justify' | 'left' | 'right'

/**
 * Defines the supported width constraints for the Typography component.
 *
 * These values control the maximum width behavior of the rendered element
 * through CSS modifiers.
 */
export type TypographyWidth = 'small' | 'medium' | 'full'

/**
 * Defines the supported semantic text color variants for the Typography component.
 *
 * Each value maps to a semantic color token in the design system.
 * These tokens ensure consistent and accessible text color usage across the application.
 *
 * Defaults to `inverse`.
 */
export type TypographyColor =
  | 'default'
  | 'subtle'
  | 'muted'
  | 'disabled'
  | 'inverse'
  | 'inverseSubtle'
  | 'success'
  | 'danger'
  | 'warning'
  | 'warningSoft'
  | 'emphasis'

/**
 * Maps each Typography variant to the semantic HTML element it should render.
 *
 * Semantic rules:
 * - extraLargeTitle renders as h1 with extra-large visual styling
 * - title           renders as h1 with standard title styling
 * - title2          renders as h2
 * - body            renders as p
 * - link            renders as a
 *
 * Both extraLargeTitle and title intentionally render as h1. The distinction between them
 * is visual only and does not affect document structure.
 */
const elementByVariant = {
  extraLargeTitle: 'h1',
  title: 'h1',
  title2: 'h2',
  title3: 'h3',
  title4: 'h4',
  title5: 'h5',
  body: 'p',
  body2: 'p',
  control: 'p',
  control2: 'p',
  link: 'a',
  link2: 'a',
} as const satisfies Record<TypographyVariant, keyof JSX.IntrinsicElements>

/**
 * Shared properties supported by all Typography variants.
 *
 * These properties cover layout, interaction, accessibility, and testability
 * concerns that are applicable regardless of the rendered element.
 */
type SharedProps = {
  /**
   * Controls the text alignment of the typography element.
   *
   * Defaults to center.
   */
  align?: TypographyAlign

  /**
   * Controls the horizontal width constraint applied to the typography element.
   *
   * Defaults to full width.
   */
  width?: TypographyWidth

  /**
   * Controls the text color using semantic tokens.
   *
   * Defaults to inverse.
   */
  color?: TypographyColor

  /**
   * Disables the default opacity applied by typography variants.
   */
  noOpacity?: boolean

  /**
   * Prevents text from wrapping to multiple lines.
   */
  noWrap?: boolean

  /**
   * Prevents text from wrapping and truncates overflowing content with an ellipsis.
   */
  truncate?: boolean

  /**
   * Forces bold font weight regardless of variant defaults.
   */
  bold?: boolean

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
type NonLinkVariant = Exclude<TypographyVariant, 'link' | 'link2'>

/**
 * Properties for non-link Typography variants.
 *
 * Used for extraLargeTitle, title, title2, and body variants.
 */
type NonLinkProps = SharedProps & {
  /**
   * Typography variant excluding link.
   *
   * Defaults to body.
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
  variant: 'link' | 'link2'
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
    variant = 'body',
    align = 'center',
    width = 'full',
    color = 'inverse',
    noOpacity = false,
    noWrap = false,
    truncate = false,
    bold = false,
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
    variant === 'extraLargeTitle' ? styles.extraLargeTitle : undefined,
    variant === 'title' ? styles.title : undefined,
    variant === 'title2' ? styles.title2 : undefined,
    variant === 'title3' ? styles.title3 : undefined,
    variant === 'title4' ? styles.title4 : undefined,
    variant === 'title5' ? styles.title5 : undefined,
    variant === 'body' ? styles.body : undefined,
    variant === 'body2' ? styles.body2 : undefined,
    variant === 'control' ? styles.control : undefined,
    variant === 'control2' ? styles.control2 : undefined,
    variant === 'link' ? styles.link : undefined,
    variant === 'link2' ? styles.link2 : undefined,
    align === 'center' ? styles.alignCenter : undefined,
    align === 'justify' ? styles.alignJustify : undefined,
    align === 'left' ? styles.alignLeft : undefined,
    align === 'right' ? styles.alignRight : undefined,
    width === 'small' ? styles.widthSmall : undefined,
    width === 'medium' ? styles.widthMedium : undefined,
    width === 'full' ? styles.widthFull : undefined,
    color === 'default' ? styles.colorDefault : undefined,
    color === 'subtle' ? styles.colorSubtle : undefined,
    color === 'muted' ? styles.colorMuted : undefined,
    color === 'disabled' ? styles.colorDisabled : undefined,
    color === 'inverse' ? styles.colorInverse : undefined,
    color === 'inverseSubtle' ? styles.colorInverseSubtle : undefined,
    color === 'success' ? styles.colorSuccess : undefined,
    color === 'danger' ? styles.colorDanger : undefined,
    color === 'warning' ? styles.colorWarning : undefined,
    color === 'warningSoft' ? styles.colorWarningSoft : undefined,
    color === 'emphasis' ? styles.colorEmphasis : undefined,
    noOpacity ? styles.noOpacity : undefined,
    noWrap ? styles.noWrap : undefined,
    truncate ? styles.truncate : undefined,
    bold ? styles.bold : undefined,
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
