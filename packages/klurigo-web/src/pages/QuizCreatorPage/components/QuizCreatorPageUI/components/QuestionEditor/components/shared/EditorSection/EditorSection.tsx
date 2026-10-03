import type { FC, ReactNode } from 'react'

import styles from './EditorSection.module.scss'

const EditorSection: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={styles.section}>{children}</div>
)

export default EditorSection
