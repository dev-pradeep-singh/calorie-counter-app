import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  hint?: ReactNode
  suffix?: string
  icon?: ReactNode
  action?: ReactNode
}

/** Labelled input: visible label tied to the input, optional hint, unit suffix, icon and trailing action. */
export function Field({ label, value, onChange, hint, suffix, icon, action, className, ...rest }: Props) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const cls = ['input', icon && 'has-icon', suffix && 'has-suffix', action && 'has-action', className].filter(Boolean).join(' ')
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="input-wrap">
        {icon && <span className="input-icon" aria-hidden>{icon}</span>}
        <input id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hintId} {...rest} />
        {suffix && <span className="input-suffix" aria-hidden>{suffix}</span>}
        {action && <span className="input-action">{action}</span>}
      </div>
      {hint && <div className="field-hint" id={hintId}>{hint}</div>}
    </div>
  )
}

/** Numeric field: decimal keypad on mobile, unit shown inside the input. */
export function NumberField(props: Props & { decimal?: boolean }) {
  const { decimal, ...rest } = props
  return <Field type="number" inputMode={decimal ? 'decimal' : 'numeric'} step={decimal ? 0.1 : 1} {...rest} />
}
