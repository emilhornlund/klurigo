import type { GameSettingsDto } from '@klurigo/common'
import { type FC, useEffect, useState } from 'react'

import { Modal, Switch } from '../../../../components'
import { useGameContext } from '../../../../context/game'

export type GameSettingsModalProps = {
  open?: boolean
  onClose?: () => void
} & GameSettingsDto

const GameSettingsModal: FC<GameSettingsModalProps> = ({
  randomizeQuestionOrder,
  randomizeAnswerOrder,
  open,
  onClose,
}) => {
  const { updateGameSettings } = useGameContext()

  const [settings, setSettings] = useState<GameSettingsDto>({
    randomizeQuestionOrder,
    randomizeAnswerOrder,
  })

  useEffect(() => {
    if (!open) return

    setSettings({
      randomizeQuestionOrder,
      randomizeAnswerOrder,
    })
  }, [open, randomizeQuestionOrder, randomizeAnswerOrder])

  const onChange = <K extends keyof GameSettingsDto>(
    key: K,
    value: GameSettingsDto[K],
  ) => {
    const next = {
      ...settings,
      [key]: value,
    }

    setSettings(next)
    updateGameSettings?.(next)
  }

  return (
    <Modal
      title="Game Settings"
      open={open}
      closeAction={{ onClick: () => onClose?.() }}>
      <Switch
        id="randomize-question-order-switch"
        label="Randomize order of questions"
        value={settings.randomizeQuestionOrder}
        onChange={(newValue) => onChange('randomizeQuestionOrder', newValue)}
      />
      <Switch
        id="randomize-answer-order-switch"
        label="Randomize order of answers"
        value={settings.randomizeAnswerOrder}
        onChange={(newValue) => onChange('randomizeAnswerOrder', newValue)}
      />
    </Modal>
  )
}

export default GameSettingsModal
