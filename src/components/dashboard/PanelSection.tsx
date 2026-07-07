import { ReactNode } from 'react'

interface Props {
  title: string
  hint?: string
  children: ReactNode
}

export function PanelSection({ title, hint, children }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
