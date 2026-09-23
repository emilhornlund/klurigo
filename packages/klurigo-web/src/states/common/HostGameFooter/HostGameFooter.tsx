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
import GameFooterShell from '../GameFooterShell'

import { PlayerManagementModal } from './components'

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
    <GameFooterShell
      leading={
        <>
          <FontAwesomeIcon icon={faCircleQuestion} />
          <Typography variant="body2" color="inverse" noOpacity bold>
            {currentQuestion} / {totalQuestions}
          </Typography>
        </>
      }
      center={
        <Typography
          variant="body2"
          align="center"
          color="inverse"
          noOpacity
          bold>
          <FontAwesomeIcon icon={faLockOpen} /> {gamePIN}
        </Typography>
      }
      trailing={
        <div ref={settingsMenuButtonRef}>
          <Button
            id="settings-button"
            type="button"
            variant="plain"
            surface="brand"
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
      }>
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
    </GameFooterShell>
  )
}

export default HostGameFooter
