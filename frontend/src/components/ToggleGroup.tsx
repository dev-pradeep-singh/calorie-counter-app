type Option<T extends string> = { value: T; label: string }

export function ToggleGroup<T extends string>({ options, value, onChange }: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="toggle-group">
      {options.map((o) => (
        <button key={o.value} type="button" className={`toggle-btn${o.value === value ? ' active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const satisfies Option<'male' | 'female'>[]

export const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
] as const satisfies Option<'lose' | 'maintain' | 'gain'>[]
