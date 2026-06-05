import { AlignLeft, CheckSquare, List, LayoutList } from 'lucide-react'

/** Human-readable labels for each item type */
export const TYPE_LABELS = {
  textbox: 'Note',
  checkbox_list: 'Checklist',
  menu_list: 'List',
  card_list: 'Cards',
}

/** Colour scheme per item type (text, background, border) */
export const TYPE_STYLES = {
  textbox: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  checkbox_list: { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  menu_list: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  card_list: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
}

/** Item type definitions for the "Add item" modal */
export const ITEM_TYPE_OPTIONS = [
  { type: 'textbox', label: 'Note', desc: 'Free-form text area (markdown)', icon: AlignLeft, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { type: 'checkbox_list', label: 'Checklist', desc: 'Items with checkboxes', icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-400/10' },
  { type: 'menu_list', label: 'List', desc: 'Simple bullet list', icon: List, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { type: 'card_list', label: 'Cards', desc: 'Title + description pairs', icon: LayoutList, color: 'text-amber-400', bg: 'bg-amber-400/10' },
]
