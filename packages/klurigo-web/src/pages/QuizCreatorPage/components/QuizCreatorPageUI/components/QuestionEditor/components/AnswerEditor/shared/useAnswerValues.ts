import { useCallback, useEffect, useState } from 'react'

export const useAnswerValues = (
  initialValues: string[] | undefined,
  minimum: number,
  maximum: number,
  onChange: (values?: string[]) => void,
) => {
  const [values, setValues] = useState<string[]>(() =>
    Array.from(
      { length: Math.max(initialValues?.length ?? 0, minimum) },
      (_, index) => initialValues?.[index] ?? '',
    ),
  )

  useEffect(() => {
    setValues((prev) =>
      Array.from(
        { length: Math.max(initialValues?.length ?? 0, prev.length, minimum) },
        (_, index) => initialValues?.[index] ?? prev[index] ?? '',
      ),
    )
  }, [initialValues, minimum])

  const change = useCallback(
    (index: number, value: string) => {
      setValues((prev) => {
        const next = [...prev]
        next[index] = value
        onChange(next)
        return next
      })
    },
    [onChange],
  )

  const add = useCallback(() => {
    setValues((prev) => (prev.length >= maximum ? prev : [...prev, '']))
  }, [maximum])

  const remove = useCallback(
    (index: number) => {
      setValues((prev) => {
        if (prev.length <= minimum) return prev
        const next = prev.filter((_, valueIndex) => valueIndex !== index)
        onChange(next)
        return next
      })
    },
    [minimum, onChange],
  )

  return { values, change, add, remove }
}
