import { useState, ReactNode } from 'react'

interface CollapsibleSectionProps {
  num: string
  title: string
  hint?: string
  children: ReactNode
  defaultOpen?: boolean
}

export function CollapsibleSection({ num, title, hint, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-mono text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-0.5 shrink-0">
          {num}
        </span>
        <h2 className="font-bold text-gray-900 text-base flex-1">{title}</h2>
        {hint && (
          <span className="text-xs text-gray-400 hidden md:block shrink-0 mr-2">{hint}</span>
        )}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-5 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
