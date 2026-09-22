import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeviceType } from '../../utils/device-size.types'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import Button from './Button'
import styles from './Button.module.scss'

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: vi.fn(),
}))

const variants = ['primary', 'outline', 'plain'] as const
const surfaces = ['brand', 'light'] as const
const intents = ['default', 'accent', 'danger', 'success'] as const

describe('Button', () => {
  beforeEach(() => {
    vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Desktop)
  })

  describe('rendering', () => {
    it('should render with the default variant, surface, intent and size', () => {
      const { container } = render(
        <Button id="my-button" type="button" value="My Button" />,
      )

      const button = screen.getByTestId('test-my-button-button')
      const buttonContainer = button.parentElement

      expect(button).toHaveAttribute('id', 'my-button')
      expect(button).toHaveAttribute('name', 'my-button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveTextContent('My Button')

      expect(buttonContainer).toHaveClass(
        styles.buttonContainer,
        styles.variantPrimary,
        styles.surfaceBrand,
        styles.intentDefault,
      )
      expect(buttonContainer).not.toHaveClass(styles.sizeSmall)

      expect(container).toMatchSnapshot()
    })

    it('should use the provided name instead of the id', () => {
      render(
        <Button
          id="my-button"
          name="custom-name"
          type="button"
          value="My Button"
        />,
      )

      expect(screen.getByTestId('test-my-button-button')).toHaveAttribute(
        'name',
        'custom-name',
      )
    })

    it.each(['button', 'submit', 'reset'] as const)(
      'should render type="%s"',
      (type) => {
        render(<Button id={`button-${type}`} type={type} value="Button" />)

        expect(
          screen.getByTestId(`test-button-${type}-button`),
        ).toHaveAttribute('type', type)
      },
    )

    it('should render children', () => {
      render(
        <Button id="my-button" type="button">
          Child content
        </Button>,
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should prefer children over value when both are provided', () => {
      render(
        <Button id="my-button" type="button" value="Value content">
          Child content
        </Button>,
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
      expect(screen.queryByText('Value content')).not.toBeInTheDocument()
    })

    it('should render without a value or children', () => {
      render(<Button id="my-button" type="button" />)

      const button = screen.getByTestId('test-my-button-button')

      expect(button.querySelector('span')).not.toBeInTheDocument()
    })

    it('should grow to fill available flex space when grow is true', () => {
      render(<Button id="my-button" type="button" value="My Button" grow />)

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).toHaveClass(styles.grow)
    })

    it('should not grow by default', () => {
      render(<Button id="my-button" type="button" value="My Button" />)

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).not.toHaveClass(styles.grow)
    })
  })

  describe('variants, surfaces and intents', () => {
    it.each(variants)('should apply the %s variant', (variant) => {
      render(
        <Button
          id={`button-${variant}`}
          type="button"
          variant={variant}
          value="Button"
        />,
      )

      const buttonContainer = screen.getByTestId(
        `test-button-${variant}-button`,
      ).parentElement

      expect(buttonContainer).toHaveClass(
        variant === 'primary'
          ? styles.variantPrimary
          : variant === 'outline'
            ? styles.variantOutline
            : styles.variantPlain,
      )
    })

    it.each(surfaces)('should apply the %s surface', (surface) => {
      render(
        <Button
          id={`button-${surface}`}
          type="button"
          surface={surface}
          value="Button"
        />,
      )

      const buttonContainer = screen.getByTestId(
        `test-button-${surface}-button`,
      ).parentElement

      expect(buttonContainer).toHaveClass(
        surface === 'brand' ? styles.surfaceBrand : styles.surfaceLight,
      )
    })

    it.each(intents)('should apply the %s intent', (intent) => {
      render(
        <Button
          id={`button-${intent}`}
          type="button"
          intent={intent}
          value="Button"
        />,
      )

      const buttonContainer = screen.getByTestId(
        `test-button-${intent}-button`,
      ).parentElement

      const expectedClass = {
        default: styles.intentDefault,
        accent: styles.intentAccent,
        danger: styles.intentDanger,
        success: styles.intentSuccess,
      }[intent]

      expect(buttonContainer).toHaveClass(expectedClass)
    })

    it.each(
      surfaces.flatMap((surface) =>
        intents.flatMap((intent) =>
          variants.map((variant) => ({
            surface,
            intent,
            variant,
          })),
        ),
      ),
    )(
      'should support $surface surface, $intent intent and $variant variant',
      ({ surface, intent, variant }) => {
        const id = `${surface}-${intent}-${variant}`

        render(
          <Button
            id={id}
            type="button"
            surface={surface}
            intent={intent}
            variant={variant}
            value="Button"
          />,
        )

        const buttonContainer = screen.getByTestId(
          `test-${id}-button`,
        ).parentElement

        expect(buttonContainer).toHaveClass(
          surface === 'brand' ? styles.surfaceBrand : styles.surfaceLight,
          {
            primary: styles.variantPrimary,
            outline: styles.variantOutline,
            plain: styles.variantPlain,
          }[variant],
          {
            default: styles.intentDefault,
            accent: styles.intentAccent,
            danger: styles.intentDanger,
            success: styles.intentSuccess,
          }[intent],
        )
      },
    )
  })

  describe('size', () => {
    it('should render normal size on desktop by default', () => {
      render(<Button id="my-button" type="button" value="Button" />)

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).not.toHaveClass(styles.sizeSmall)
    })

    it('should render small size when explicitly requested', () => {
      render(
        <Button id="my-button" type="button" size="small" value="Button" />,
      )

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).toHaveClass(styles.sizeSmall)
    })

    it('should use normal size by default on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(<Button id="my-button" type="button" value="Button" />)

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).not.toHaveClass(styles.sizeSmall)
    })

    it.each([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop])(
      'should respect normal size on %s',
      (deviceType) => {
        vi.mocked(useDeviceSizeType).mockReturnValue(deviceType)

        render(
          <Button id="my-button" type="button" size="normal" value="Button" />,
        )

        expect(
          screen.getByTestId('test-my-button-button').parentElement,
        ).not.toHaveClass(styles.sizeSmall)
      },
    )

    it.each([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop])(
      'should respect small size on %s',
      (deviceType) => {
        vi.mocked(useDeviceSizeType).mockReturnValue(deviceType)

        render(
          <Button id="my-button" type="button" size="small" value="Button" />,
        )

        expect(
          screen.getByTestId('test-my-button-button').parentElement,
        ).toHaveClass(styles.sizeSmall)
      },
    )
  })

  describe('value visibility', () => {
    it('should show the value on mobile by default', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(<Button id="my-button" type="button" value="My Button" />)

      expect(screen.getByText('My Button')).toBeInTheDocument()
    })

    it('should hide the value on mobile when hideValue is mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          hideValue="mobile"
        />,
      )

      expect(screen.queryByText('My Button')).not.toBeInTheDocument()
    })

    it.each([DeviceType.Tablet, DeviceType.Desktop])(
      'should show the value on %s when hideValue is mobile',
      (deviceType) => {
        vi.mocked(useDeviceSizeType).mockReturnValue(deviceType)

        render(
          <Button
            id="my-button"
            type="button"
            value="My Button"
            hideValue="mobile"
          />,
        )

        expect(screen.getByText('My Button')).toBeInTheDocument()
      },
    )

    it('should show the value on mobile when hideValue is never', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          hideValue="never"
        />,
      )

      expect(screen.getByText('My Button')).toBeInTheDocument()
    })
  })

  describe('icons', () => {
    it('should render a leading icon before the value by default', () => {
      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          icon={faArrowLeft}
        />,
      )

      const button = screen.getByTestId('test-my-button-button')
      const icon = button.querySelector('svg')
      const value = screen.getByText('My Button')

      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass(styles.icon)
      expect(button.children[0]).toBe(icon)
      expect(button.children[1]).toBe(value)
      expect(button.parentElement).not.toHaveClass(styles.iconOnly)
    })

    it('should render a trailing icon after the value', () => {
      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          icon={faArrowRight}
          iconPosition="trailing"
        />,
      )

      const button = screen.getByTestId('test-my-button-button')
      const icon = button.querySelector('svg')
      const value = screen.getByText('My Button')

      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass(styles.icon)
      expect(button.children[0]).toBe(value)
      expect(button.children[1]).toBe(icon)
      expect(button.parentElement).not.toHaveClass(styles.iconOnly)
    })

    it('should render an icon-only button', () => {
      render(<Button id="my-button" type="button" icon={faArrowLeft} />)

      const button = screen.getByTestId('test-my-button-button')

      expect(button.querySelector('svg')).toBeInTheDocument()
      expect(button.querySelector('svg')).toHaveClass(styles.icon)
      expect(button.querySelector('span')).not.toBeInTheDocument()
      expect(button.parentElement).toHaveClass(styles.iconOnly)
    })

    it('should apply the icon-only state to a small button', () => {
      render(
        <Button id="my-button" type="button" size="small" icon={faArrowLeft} />,
      )

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).toHaveClass(styles.sizeSmall, styles.iconOnly)
    })

    it('should keep a small button with text out of the icon-only state', () => {
      render(
        <Button
          id="my-button"
          type="button"
          size="small"
          value="My Button"
          icon={faArrowLeft}
        />,
      )

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).toHaveClass(styles.sizeSmall)
      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).not.toHaveClass(styles.iconOnly)
    })

    it('should keep the icon visible when the value is hidden on mobile', () => {
      vi.mocked(useDeviceSizeType).mockReturnValue(DeviceType.Mobile)

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          icon={faArrowLeft}
          hideValue="mobile"
        />,
      )

      const button = screen.getByTestId('test-my-button-button')

      expect(button.querySelector('svg')).toBeInTheDocument()
      expect(screen.queryByText('My Button')).not.toBeInTheDocument()
      expect(button.parentElement).toHaveClass(styles.iconOnly)
    })
  })

  describe('disabled', () => {
    it('should disable the button when disabled is true', () => {
      render(<Button id="my-button" type="button" value="My Button" disabled />)

      expect(screen.getByTestId('test-my-button-button')).toBeDisabled()
    })

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn()

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          disabled
          onClick={onClick}
        />,
      )

      fireEvent.click(screen.getByTestId('test-my-button-button'))

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('loading', () => {
    it('should disable the button while loading', () => {
      render(<Button id="my-button" type="button" value="My Button" loading />)

      expect(screen.getByTestId('test-my-button-button')).toBeDisabled()
    })

    it('should hide the value and render the loading spinner while loading', () => {
      render(<Button id="my-button" type="button" value="My Button" loading />)

      const button = screen.getByTestId('test-my-button-button')

      expect(screen.queryByText('My Button')).not.toBeInTheDocument()
      expect(
        button.querySelector(`.${styles.loadingSpinner}`),
      ).toBeInTheDocument()
    })

    it('should hide the icon while loading', () => {
      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          icon={faArrowLeft}
          loading
        />,
      )

      const button = screen.getByTestId('test-my-button-button')

      expect(button.querySelector('svg')).not.toBeInTheDocument()
    })

    it('should not call onClick while loading', () => {
      const onClick = vi.fn()

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          loading
          onClick={onClick}
        />,
      )

      fireEvent.click(screen.getByTestId('test-my-button-button'))

      expect(onClick).not.toHaveBeenCalled()
    })

    it('should render the small loading state when size is small', () => {
      const { container } = render(
        <Button
          id="my-button"
          type="button"
          size="small"
          value="My Button"
          loading
        />,
      )

      expect(
        screen.getByTestId('test-my-button-button').parentElement,
      ).toHaveClass(styles.sizeSmall)

      expect(container).toMatchSnapshot()
    })
  })

  describe('events', () => {
    it('should receive onClick event when button is clicked', () => {
      const onClick = vi.fn()

      render(
        <Button
          id="my-button"
          type="button"
          value="My Button"
          onClick={onClick}
        />,
      )

      fireEvent.click(screen.getByTestId('test-my-button-button'))

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })
})
