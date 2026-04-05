import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC, ReactNode } from 'react'
import React, { useLayoutEffect } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import styles from './Menu.module.scss'

export interface MenuItemProps {
  icon?: IconDefinition
  link?: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export const MenuItem: FC<MenuItemProps> = ({
  icon,
  link,
  disabled = false,
  onClick,
  children,
}) => {
  const navigate = useNavigate()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (link) {
      navigate(link)
    }

    onClick?.()
  }

  return (
    <button
      className={styles.menuItemButton}
      disabled={disabled}
      onClick={handleClick}>
      <div className={styles.content}>
        {icon && <FontAwesomeIcon icon={icon} className={styles.icon} />}
        <span>{children}</span>
      </div>
    </button>
  )
}

export const MenuSeparator: FC = () => <div className={styles.menuSeparator} />

type MenuPosition = 'below' | 'above'
type MenuAlign = 'start' | 'end'

export interface MenuProps {
  anchorRef: React.RefObject<HTMLElement | null>
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode

  /**
   * Controls whether the menu renders below or above the anchor.
   * Default: 'below'
   */
  position?: MenuPosition

  /**
   * Horizontal alignment relative to the anchor.
   * - 'start': align menu left edge with anchor left edge
   * - 'end': align menu right edge with anchor right edge
   * Default: 'end' (closest to your current behaviour of anchoring to the right side)
   */
  align?: MenuAlign

  /**
   * Pixel gap between the anchor and the menu.
   * Default: 8
   */
  gap?: number
}

export const Menu: FC<MenuProps> = ({
  anchorRef,
  isOpen,
  onClose,
  children,
  position = 'below',
  align = 'end',
  gap = 8,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  const updatePosition = () => {
    const anchorEl = anchorRef.current
    if (!anchorEl) return

    const anchorRect = anchorEl.getBoundingClientRect()

    const top =
      position === 'below' ? anchorRect.bottom + gap : anchorRect.top - gap

    const left = align === 'start' ? anchorRect.left : anchorRect.right

    setMenuPosition({ top, left })
  }

  // Use layout effect so we can measure menu size immediately after it appears
  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }

    // Let it render, then measure/position
    requestAnimationFrame(() => {
      updatePosition()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, position, align, gap])

  // Keep it positioned correctly while open (scroll/resize)
  useEffect(() => {
    if (!isOpen) return

    const onWindowChange = () => updatePosition()

    window.addEventListener('resize', onWindowChange)
    // capture=true catches scroll on ancestors as well
    window.addEventListener('scroll', onWindowChange, true)

    return () => {
      window.removeEventListener('resize', onWindowChange)
      window.removeEventListener('scroll', onWindowChange, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, position, align, gap])

  const translateX = align === 'start' ? '0' : '-100%'
  const translateY = position === 'below' ? '0' : '-100%'

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{
        position: 'fixed',
        top: menuPosition?.top ?? 0,
        left: menuPosition?.left ?? 0,
        transform: `translate(${translateX}, ${translateY})`,
        visibility: menuPosition ? 'visible' : 'hidden',
      }}>
      {children}
    </div>
  )
}
