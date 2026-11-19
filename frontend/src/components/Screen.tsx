import { useEffect, useRef, type ReactNode } from 'react'

/** One screen per route. Moves focus to the screen on mount so screen readers announce the change. */
export function Screen({ id, label, nav = false, centered = false, children }: {
  id: string
  label: string
  nav?: boolean
  centered?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [])
  return (
    <main id={id} ref={ref} tabIndex={-1} aria-label={label}
      className={`screen${nav ? ' with-nav' : ''}${centered ? ' centered' : ''}`} style={{ outline: 'none' }}>
      {children}
    </main>
  )
}
