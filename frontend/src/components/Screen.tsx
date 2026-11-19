import type { ReactNode } from 'react'

/** The old app's `.screen.active` container; one screen is rendered per route. */
export function Screen({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="screen active">
      {children}
    </div>
  )
}
