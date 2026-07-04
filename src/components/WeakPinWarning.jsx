import { AlertTriangle } from 'lucide-react'

export default function WeakPinWarning({ message }) {
  if (!message) return null
  return (
    <div className="flex gap-2 items-start bg-amber-400/10 border border-amber-400/25 rounded-lg px-3 py-2">
      <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-amber-400 text-xs leading-relaxed">{message}</p>
    </div>
  )
}
