import type { FC, PropsWithChildren } from 'react'

import Modal from '../../../Modal'
import Stack from '../../../Stack'
import Typography from '../../../Typography'

type FilterDialogProps = PropsWithChildren<{
  title: string
  open: boolean
  onClose: () => void
  onApply: () => void
}>

/** Provides the layout and actions shared by the search filter dialogs. */
const FilterDialog: FC<FilterDialogProps> = ({
  title,
  open,
  onClose,
  onApply,
  children,
}) => (
  <Modal
    title={title}
    open={open}
    closeAction={{ label: 'Close', onClick: onClose }}
    primaryAction={{ label: 'Apply', onClick: onApply }}>
    {children}
  </Modal>
)

export const FilterDialogBody: FC<
  PropsWithChildren<{ description: string }>
> = ({ description, children }) => (
  <Stack>
    <Typography variant="body2" noOpacity>
      {description}
    </Typography>
    {children}
  </Stack>
)

export default FilterDialog
