import { useEffect, useState } from 'react'

const EXIT_DURATION_MS = 300
const REDUCED_EXIT_DURATION_MS = 180

const useSubmitButtonExit = (shouldExit: boolean) => {
  const [shouldRender, setShouldRender] = useState(!shouldExit)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!shouldExit) {
      setShouldRender(true)
      setIsExiting(false)
      return
    }

    if (!shouldRender) return

    setIsExiting(true)
    const exitDuration = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      .matches
      ? REDUCED_EXIT_DURATION_MS
      : EXIT_DURATION_MS
    const timeout = window.setTimeout(
      () => setShouldRender(false),
      exitDuration,
    )

    return () => window.clearTimeout(timeout)
  }, [shouldExit, shouldRender])

  return { shouldRender, isExiting }
}

export default useSubmitButtonExit
