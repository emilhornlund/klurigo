import {
  faBinoculars,
  faGamepad,
  faGear,
  faIdCard,
  faLightbulb,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import {
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Avatar from '../../assets/images/avatar.svg'
import Bars from '../../assets/images/bars.svg'
import KlurigoIcon from '../../assets/images/klurigo-icon.svg'
import { useAuthContext } from '../../context/auth'
import { DeviceType } from '../../utils/device-size.types'
import { classNames } from '../../utils/helpers'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'
import { Menu, MenuItem, MenuSeparator } from '../Menu'

import styles from './Page.module.scss'

/**
 * Defines the page-level geometry used by {@link Page}.
 *
 * Layouts:
 * - `contained`: Standard bounded page width with normal content height.
 * - `compact`: Narrower bounded page width with normal content height.
 * - `fill`: Standard bounded page width that fills the available content height.
 * - `compactFill`: Narrower bounded page width that fills the available content height.
 * - `fullBleed`: Full-width and full-height content with edge-to-edge page treatment.
 */
type PageLayout = 'contained' | 'compact' | 'fill' | 'compactFill' | 'fullBleed'

export interface PageProps {
  /**
   * Controls the page-level content geometry.
   *
   * - `contained`: Standard bounded width and normal height.
   * - `compact`: Compact bounded width and normal height.
   * - `fill`: Standard bounded width and full available height.
   * - `compactFill`: Compact bounded width and full available height.
   * - `fullBleed`: Full width, full available height, and edge-to-edge treatment.
   */
  layout: PageLayout

  /**
   * Controls how content is distributed vertically within the page.
   *
   * @default 'center'
   */
  align?: 'start' | 'center' | 'space-between'

  /**
   * Removes the bottom page padding.
   *
   * @default false
   */
  noPadding?: boolean

  /**
   * Displays navigation to the quiz discovery experience when available.
   *
   * @default false
   */
  discover?: boolean

  /**
   * Displays authenticated profile navigation when available.
   *
   * @default false
   */
  profile?: boolean

  /**
   * Hides the login action for unauthenticated users.
   *
   * @default false
   */
  hideLogin?: boolean

  /**
   * Disables the content fade-in animation.
   *
   * @default false
   */
  disableContentFadeAnimation?: boolean

  /**
   * Optional content rendered in the page header.
   */
  header?: ReactNode

  /**
   * Optional content rendered in the page footer.
   */
  footer?: ReactNode

  /**
   * Main page content.
   */
  children: ReactNode | ReactNode[]
}

/**
 * Shared application page shell.
 *
 * Provides the Klurigo header, responsive page geometry, optional navigation,
 * profile controls, content alignment, and footer.
 *
 * Use `layout` to select the page geometry rather than applying page-level
 * width or height constraints in individual consumers.
 */
const Page: FC<PageProps> = ({
  layout,
  align = 'center',
  noPadding = false,
  discover = false,
  profile = false,
  hideLogin = false,
  disableContentFadeAnimation = false,
  header,
  footer,
  children,
}) => {
  const { user, isUserAuthenticated, revokeUser } = useAuthContext()

  const navigate = useNavigate()

  const deviceType = useDeviceSizeType()
  const isMobile = useMemo(() => deviceType === DeviceType.Mobile, [deviceType])

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuButtonRef = useRef<HTMLDivElement>(null)

  const toggleProfileMenu = () => setProfileMenuOpen((prev) => !prev)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLDivElement>(null)

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev)

  const handleRevokeUser = useCallback(async () => {
    await revokeUser()
  }, [revokeUser])

  const profileMenuItems = useMemo(() => {
    if (!isUserAuthenticated || !profile) {
      return null
    }
    return (
      <>
        <MenuItem icon={faIdCard} link={`/users/${user?.ACCESS.sub}/profile`}>
          Profile
        </MenuItem>
        <MenuItem icon={faLightbulb} link="/profile/quizzes">
          Quizzes
        </MenuItem>
        <MenuItem icon={faGamepad} link="/profile/games">
          Games
        </MenuItem>
        <MenuItem icon={faGear} link="/profile/settings">
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={faRightFromBracket} onClick={handleRevokeUser}>
          Logout
        </MenuItem>
      </>
    )
  }, [profile, isUserAuthenticated, user, handleRevokeUser])

  return (
    <div className={styles.main}>
      <div
        className={classNames(
          styles.header,
          layout === 'fullBleed' ? styles.fullBleed : undefined,
        )}>
        <button className={styles.logo} onClick={() => navigate('/')}>
          <img className={styles.icon} src={KlurigoIcon} alt="Klurigo" />
          <span className={styles.text}>Klurigo</span>
        </button>
        <div className={styles.side}>
          {isUserAuthenticated && discover && !isMobile && (
            <Link to="/discover">Discover</Link>
          )}
          {!isUserAuthenticated && !hideLogin && (
            <Link to="/auth/login">Login</Link>
          )}
          {isUserAuthenticated && discover && header && !isMobile && (
            <div className={styles.verticalLine} />
          )}
          {header}
          {isUserAuthenticated && profile && !isMobile && (
            <div
              className={styles.menuButtonWrapper}
              ref={profileMenuButtonRef}>
              <button
                onClick={toggleProfileMenu}
                type="button"
                className={styles.menuButton}>
                <img src={Avatar} alt="Profile" />
              </button>
              <Menu
                anchorRef={profileMenuButtonRef}
                isOpen={profileMenuOpen}
                onClose={() => setProfileMenuOpen(false)}>
                {profileMenuItems}
              </Menu>
            </div>
          )}
          {isUserAuthenticated && isMobile && (discover || profile) && (
            <div className={styles.menuButtonWrapper} ref={mobileMenuButtonRef}>
              <button
                onClick={toggleMobileMenu}
                type="button"
                className={styles.menuButton}>
                <img src={Bars} alt="Menu" />
              </button>
              <Menu
                anchorRef={mobileMenuButtonRef}
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}>
                {discover && (
                  <MenuItem icon={faBinoculars} link="/discover">
                    Discover
                  </MenuItem>
                )}
                {discover && <MenuSeparator />}
                {profileMenuItems}
              </Menu>
            </div>
          )}
        </div>
      </div>
      <div
        className={classNames(
          styles.content,
          styles[layout],
          align === 'start' ? styles.startAlign : undefined,
          align === 'center' ? styles.centerAlign : undefined,
          align === 'space-between' ? styles.spaceBetweenAlign : undefined,
          noPadding ? styles.noPadding : undefined,
        )}>
        <div className={styles.contentWrapper}>
          <div
            className={classNames(
              styles.contentInner,
              disableContentFadeAnimation ? styles.disableAnimation : undefined,
            )}>
            {children}
          </div>
        </div>
      </div>
      {footer && (
        <div
          className={classNames(
            styles.footer,
            layout === 'fullBleed' ? styles.fullBleed : undefined,
          )}>
          {footer}
        </div>
      )}
    </div>
  )
}

export default Page
