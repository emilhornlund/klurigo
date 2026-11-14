import {
  faBinoculars,
  faGamepad,
  faGear,
  faLightbulb,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Bars from '../../assets/images/bars.svg'
import KlurigoIcon from '../../assets/images/klurigo-icon.svg'
import { useAuthContext } from '../../context/auth'
import { useUserContext } from '../../context/user'
import { DeviceType } from '../../utils/device-size.types'
import { classNames } from '../../utils/helpers'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'
import { Menu, MenuItem, MenuSeparator } from '../Menu'
import PlayerAvatar from '../PlayerAvatar'

import styles from './Page.module.scss'

const PROFILE_AVATAR_SIZE = 44
const MENU_AVATAR_SIZE = 32

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
   * Allows the page content region to scroll vertically.
   *
   * @default true
   */
  scrollable?: boolean

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
  scrollable = true,
  discover = false,
  profile = false,
  hideLogin = false,
  disableContentFadeAnimation = false,
  header,
  footer,
  children,
}) => {
  const { user, isUserAuthenticated, revokeUser } = useAuthContext()
  const { currentUser, fetchCurrentUser } = useUserContext()
  const userId = user?.ACCESS?.sub
  const accessToken = user?.ACCESS?.token
  const avatar =
    userId && currentUser?.id === userId
      ? (currentUser?.avatar ?? undefined)
      : undefined
  const hydratedToken = useRef<string | undefined>(undefined)

  // Older persisted snapshots predate avatar support. Hydrate once without
  // issuing a request on every page change or looping after a load failure.
  useEffect(() => {
    const needsAvatar =
      currentUser?.id !== userId || !Object.hasOwn(currentUser ?? {}, 'avatar')
    if (
      !profile ||
      !isUserAuthenticated ||
      !accessToken ||
      !needsAvatar ||
      hydratedToken.current === accessToken
    )
      return
    hydratedToken.current = accessToken
    void fetchCurrentUser(accessToken).catch(() => undefined)
  }, [
    profile,
    isUserAuthenticated,
    accessToken,
    userId,
    currentUser,
    fetchCurrentUser,
  ])

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
        <MenuItem link={`/users/${userId}/profile`}>
          <span className={styles.profileMenuIdentity}>
            <span className={styles.profileMenuAvatarSlot}>
              <PlayerAvatar
                avatar={avatar}
                size={MENU_AVATAR_SIZE}
                alt=""
                className={styles.menuAvatar}
              />
            </span>
            <span>Profile</span>
          </span>
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
  }, [profile, isUserAuthenticated, userId, handleRevokeUser, avatar])

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
                aria-label="Profile"
                aria-expanded={profileMenuOpen}
                className={styles.menuButton}>
                <PlayerAvatar
                  avatar={avatar}
                  size={PROFILE_AVATAR_SIZE}
                  alt=""
                  className={styles.profileAvatar}
                />
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
                <img src={Bars} alt="Menu" className={styles.navigationIcon} />
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
      <main
        className={classNames(
          styles.content,
          styles[layout],
          !scrollable ? styles.noScroll : undefined,
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
      </main>
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
