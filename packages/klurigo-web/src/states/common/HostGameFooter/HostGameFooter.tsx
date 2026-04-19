import {
  faCircleQuestion,
  faGear,
  faLockOpen,
  faMaximize,
  faMinimize,
  faRightFromBracket,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC, useRef, useState } from 'react'

import {
  Button,
  ConfirmDialog,
  Menu,
  MenuItem,
  MenuSeparator,
  Typography,
} from '../../../components'
import { useGameContext } from '../../../context/game'

import { PlayerManagementModal } from './components'
import styles from './HostGameFooter.module.scss'

export interface HostGameFooterProps {
  gamePIN: string
  currentQuestion: number
  totalQuestions: number
}

const HostGameFooter: FC<HostGameFooterProps> = ({
  gamePIN,
  currentQuestion,
  totalQuestions,
}) => {
  const { isFullscreenActive, toggleFullscreen, quitGame } = useGameContext()

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const settingsMenuButtonRef = useRef<HTMLDivElement>(null)
  const toggleSettingsMenu = () => setSettingsMenuOpen((prev) => !prev)

  const [playerManagementModalOpen, setPlayerManagementModalOpen] =
    useState<boolean>(false)

  const [showConfirmQuitGameDialog, setShowConfirmQuitGameDialog] =
    useState<boolean>(false)

  return (
    <div className={styles.main}>
      <div className={styles.questions}>
        <FontAwesomeIcon icon={faCircleQuestion} className={styles.icon} />
        <Typography variant="body2" align="left" color="inverse" noOpacity bold>
          {currentQuestion} / {totalQuestions}
        </Typography>
      </div>
      <div className={styles.gamePIN}>
        <Typography
          variant="body2"
          align="center"
          color="inverse"
          noOpacity
          bold>
          <FontAwesomeIcon icon={faLockOpen} /> {gamePIN}
        </Typography>
      </div>
      <div className={styles.actions}>
        <div className={styles.menuButtonWrapper} ref={settingsMenuButtonRef}>
          <Button
            id="settings-button"
            type="button"
            kind="plain"
            icon={faGear}
            onClick={toggleSettingsMenu}
          />
          <Menu
            anchorRef={settingsMenuButtonRef}
            position="above"
            align="end"
            isOpen={settingsMenuOpen}
            onClose={toggleSettingsMenu}>
            <MenuItem
              icon={faUsers}
              onClick={() => setPlayerManagementModalOpen(true)}>
              Players
            </MenuItem>
            <MenuItem
              icon={isFullscreenActive ? faMinimize : faMaximize}
              onClick={toggleFullscreen}>
              {isFullscreenActive ? 'Minimize' : 'Maximize'}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={faRightFromBracket}
              onClick={() => setShowConfirmQuitGameDialog(true)}>
              Quit
            </MenuItem>
          </Menu>
        </div>
      </div>
      <PlayerManagementModal
        open={playerManagementModalOpen}
        onClose={() => setPlayerManagementModalOpen(false)}
      />
      <ConfirmDialog
        title="Are you sure you want to quit the game?"
        message="This will immediately end the game for all participants, and it cannot be resumed."
        open={showConfirmQuitGameDialog}
        confirmTitle="Quit Game"
        onConfirm={() => {
          quitGame?.()
          setShowConfirmQuitGameDialog(false)
        }}
        onClose={() => setShowConfirmQuitGameDialog(false)}
        destructive
      />
    </div>
  )
}

export default HostGameFooter
