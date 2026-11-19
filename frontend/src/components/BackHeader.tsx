import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from '@phosphor-icons/react'

export function BackHeader({ title, to = '/', right }: { title: string; to?: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="page-head">
      <button className="icon-btn" onClick={() => navigate(to)} aria-label="Back">
        <ArrowLeft size={20} weight="bold" aria-hidden />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  )
}
