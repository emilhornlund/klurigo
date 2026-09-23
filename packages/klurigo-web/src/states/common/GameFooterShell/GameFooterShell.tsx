import type { FC, ReactNode } from 'react'

import { Surface } from '../../../components'

import styles from './GameFooterShell.module.scss'

export interface GameFooterShellProps {
  leading: ReactNode
  center: ReactNode
  trailing: ReactNode
  children?: ReactNode
}

const GameFooterShell: FC<GameFooterShellProps> = ({
  leading,
  center,
  trailing,
  children,
}) => (
  <Surface className={styles.main}>
    <div className={styles.leading}>{leading}</div>
    <div className={styles.center}>{center}</div>
    <div className={styles.trailing}>{trailing}</div>
    {children}
  </Surface>
)

export default GameFooterShell
