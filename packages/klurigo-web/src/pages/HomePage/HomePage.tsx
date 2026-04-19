import { GAME_PIN_LENGTH, GAME_PIN_REGEX } from '@klurigo/common'
import { type FC, type FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { ApiError } from '../../api/api.utils'
import KlurigoIcon from '../../assets/images/klurigo-icon.svg'
import {
  CallToActionCard,
  IconButtonArrowRight,
  Page,
  PageProminentIcon,
  RotatingMessage,
  TextField,
  Typography,
} from '../../components'
import { useAuthContext } from '../../context/auth'
import { classNames } from '../../utils/helpers'

import styles from './HomePage.module.scss'

/**
 * Playful tagline messages displayed beneath the page title.
 *
 * These messages are presented using `RotatingMessage`, which cycles through the list
 * with staged enter/exit transitions.
 */
const MESSAGES = [
  'Ready to show off your skills? Let’s go!',
  'Think you’ve got what it takes?',
  'The clock is ticking! Are you prepared?',
  'Time to put your knowledge to the test!',
  'Get your game face on. It’s time to win!',
  'Eyes on the prize! Are you ready?',
]

/**
 * The Klurigo home page.
 *
 * Responsibilities:
 * - Presents the primary join flow where a player enters a Game PIN and proceeds to game authentication.
 * - If the current client already has an active game session, presents a "Resume game" call-to-action
 *   to re-authenticate and continue without re-entering the PIN.
 * - Provides a secondary call-to-action to either create a quiz (authenticated) or log in (unauthenticated).
 */
const HomePage: FC = () => {
  /**
   * Auth state for the current client.
   *
   * `game` may contain game-scoped tokens and metadata, used here to determine whether there is an active
   * session that can be resumed.
   */
  const { isUserAuthenticated, game, revokeGame } = useAuthContext()

  /**
   * Quiz service client providing API operations used on the home page.
   *
   * `authenticateGame` is used to re-authenticate a previously joined game session by game id.
   */
  const { authenticateGame } = useKlurigoServiceClient()

  /**
   * Router navigation helper used to move the user into the relevant flow:
   * - `/auth/game?pin=...` when joining via Game PIN
   * - `/game` when resuming an existing session
   */
  const navigate = useNavigate()

  /**
   * Controlled value for the Game PIN input.
   */
  const [gamePIN, setGamePIN] = useState<string>()

  /**
   * Tracks whether the Game PIN input is currently valid according to the TextField validation rules.
   *
   * This is used to enable/disable the "Join the game" submit button.
   */
  const [gamePINValid, setGamePINValid] = useState<boolean>(false)

  /**
   * The active game id for the current client session, if present.
   *
   * When set, the UI renders a "Resume game" button that allows the client to re-authenticate and
   * continue the active session.
   */
  const activeGameId = useMemo(() => game?.ACCESS?.gameId, [game])

  /**
   * Resumes an already active game session.
   *
   * Flow:
   * - Requires an `activeGameId` to exist (should always be true if the resume CTA is visible).
   * - Calls `authenticateGame` to refresh/confirm the game session.
   * - Navigates to `/game` on success.
   * - If authentication fails with 401, revokes the current game token(s) to force a clean state.
   *
   * @throws Error if the handler runs without an active game id.
   */
  const handleRejoinGame = () => {
    if (!activeGameId) {
      throw new Error('No active game was found')
    }

    authenticateGame({ gameId: activeGameId })
      .then(() => navigate('/game'))
      .catch(async (error) => {
        if (error instanceof ApiError && error.status === 401) {
          await revokeGame()
        }
      })
  }

  /**
   * Handles submission of the join form.
   *
   * Flow:
   * - Prevents default form submission.
   * - If a Game PIN is present, navigates to the game authentication route,
   *   passing the pin in the query string.
   *
   * @param event - The form submission event.
   */
  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (gamePIN) {
      navigate(`/auth/game?pin=${gamePIN}`)
    }
  }

  return (
    <Page discover profile>
      <div className={styles.icon}>
        <PageProminentIcon src={KlurigoIcon} alt="Klurigo" />
      </div>
      <div className={styles.hero}>
        <Typography
          variant="extraLargeTitle"
          width="medium"
          align="center"
          color="inverse">
          Let’s play
        </Typography>
      </div>
      <div className={styles.message}>
        <RotatingMessage
          messages={MESSAGES}
          renderMessage={(message) => (
            <Typography
              variant="body"
              width="small"
              align="center"
              color="inverse">
              {message}
            </Typography>
          )}
        />
      </div>

      {activeGameId && (
        <CallToActionCard
          title="Resume game"
          text="Jump back in where you left off"
          onClick={handleRejoinGame}
        />
      )}

      <form
        className={classNames(styles.joinForm, styles.form)}
        onSubmit={handleJoinSubmit}>
        <TextField
          id="game-pin"
          type="text"
          placeholder="Game PIN"
          value={gamePIN ?? ''}
          minLength={GAME_PIN_LENGTH}
          maxLength={GAME_PIN_LENGTH}
          regex={GAME_PIN_REGEX}
          onChange={(value) => setGamePIN(value as string)}
          onValid={setGamePINValid}
          required
        />
        <IconButtonArrowRight
          id="join"
          type="submit"
          kind="call-to-action"
          value="Join the game"
          disabled={!gamePINValid}
        />
      </form>
      {isUserAuthenticated ? (
        <Typography
          variant="link"
          width="small"
          align="center"
          color="inverse"
          asChild>
          <Link to={'/quiz/create'} className={styles.link}>
            Create your own quiz and challenge others!
          </Link>
        </Typography>
      ) : (
        <Typography
          variant="link"
          width="small"
          align="center"
          color="inverse"
          asChild>
          <Link to={'/auth/login'} className={styles.link}>
            Want to create your own quiz? Log in to get started!
          </Link>
        </Typography>
      )}
    </Page>
  )
}

export default HomePage
