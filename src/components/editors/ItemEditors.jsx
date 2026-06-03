/**
 * ItemEditors.jsx - Content editors for each space-item type.
 *
 * Exports four editor components, one per item type:
 *   - TextboxEditor    - Free-form text area (Note) with markdown preview
 *   - ChecklistEditor  - Checkbox items (add / check / remove)
 *   - MenuListEditor   - Simple bullet list
 *   - CardListEditor   - Title + description card pairs
 *
 * Each editor receives the current `content` object and an
 * `onChange(newContent)` callback. They manage their own local
 * state and push changes up on every keystroke so the parent
 * can track dirty state and auto-save.
 *
 * Bug fixes applied:
 *   - TextboxEditor: removed duplicate `adjust()` call (was firing
 *     both in handleChange and in the useEffect).
 *   - ChecklistEditor & MenuListEditor: replaced global
 *     `document.querySelectorAll` with a scoped container ref so
 *     focus targets the correct input when multiple editors exist.
 */

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, CheckSquare, Square, Eye, EyeOff } from 'lucide-react'
import MarkdownPreview from './MarkdownPreview'

// ─────────────────────────────────────────────────────────
// Shared delete button (shown on hover)
// ─────────────────────────────────────────────────────────

/** Small icon-only delete button, visible only when the row is hovered */
function DelBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all shrink-0"
    >
      <Trash2 size={13} />
    </button>
  )
}


// ─────────────────────────────────────────────────────────
// TextboxEditor (Note)
// ─────────────────────────────────────────────────────────

/**
 * Auto-expanding textarea for free-form note content.
 * Includes a toggle for markdown preview.
 *
 * @param {{ content: { text: string }, onChange: Function }} props
 */
export function TextboxEditor({ content, onChange }) {
  const [text, setText]         = useState(content?.text || '')
  const [preview, setPreview]   = useState(false)
  const ref = useRef(null)

  /**
   * Resize the textarea to fit its content.
   * Called only from the useEffect (not from handleChange)
   * to avoid double-calling.
   */
  const adjust = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Sync local text when the content prop changes from outside
  // (e.g. after a discard or realtime update)
  useEffect(() => {
    setText(content?.text || '')
  }, [content?.text])

  // Auto-resize whenever text changes
  useEffect(() => { adjust() }, [text])

  /** Handle user typing - update local state and notify parent */
  const handleChange = (e) => {
    setText(e.target.value)
    onChange({ text: e.target.value })
    // Note: adjust() is NOT called here - the useEffect above handles it
  }

  return (
    <div className="space-y-2">
      {/* Toolbar: markdown preview toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setPreview(v => !v)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent-muted"
          title={preview ? 'Switch to edit mode' : 'Preview markdown'}
        >
          {preview ? <EyeOff size={13} /> : <Eye size={13} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        /* ── Markdown preview ── */
        <div className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm text-text-primary leading-relaxed min-h-[80px] prose-custom">
          {text ? (
            <MarkdownPreview text={text} />
          ) : (
            <span className="text-text-muted italic">Nothing to preview</span>
          )}
        </div>
      ) : (
        /* ── Editable textarea ── */
        <textarea
          ref={ref}
          value={text}
          onChange={handleChange}
          placeholder="Start writing anything…"
          rows={3}
          className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-none overflow-hidden leading-relaxed min-h-[80px]"
        />
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// ChecklistEditor
// ─────────────────────────────────────────────────────────

/**
 * Checkbox list editor - each item has a toggle and text input.
 *
 * Uses a scoped container ref for focus management so adding a
 * new item focuses the correct input even when multiple checklists
 * exist on the same page.
 *
 * @param {{ content: { items: Array }, onChange: Function }} props
 */
export function ChecklistEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])
  const containerRef = useRef(null)

  // Sync with parent when content changes externally
  useEffect(() => {
    setItems(content?.items || [])
  }, [content?.items])

  /** Update local state and push to parent */
  const push = (newItems) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  /** Add a new empty item and focus its input */
  const addItem = () => {
    const newItems = [...items, { id: crypto.randomUUID(), text: '', checked: false }]
    push(newItems)

    // Focus the last input inside THIS editor (scoped via containerRef)
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll('[data-checklist-input]')
      inputs?.[inputs.length - 1]?.focus()
    }, 50)
  }

  /** Update a single field on an item */
  const updateItem = (id, field, value) =>
    push(items.map(item => item.id === id ? { ...item, [field]: value } : item))

  /** Remove an item by id */
  const removeItem = (id) =>
    push(items.filter(item => item.id !== id))

  /**
   * Keyboard shortcuts:
   *   Enter     → add a new item below
   *   Backspace → delete the current item if its text is empty
   */
  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace' && items[idx].text === '' && items.length > 1) {
      e.preventDefault()
      push(items.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group py-0.5">
          {/* Checkbox toggle */}
          <button
            onClick={() => updateItem(item.id, 'checked', !item.checked)}
            className="shrink-0 text-text-muted hover:text-accent transition-colors"
          >
            {item.checked
              ? <CheckSquare size={17} className="text-accent" />
              : <Square size={17} />}
          </button>

          {/* Text input */}
          <input
            data-checklist-input
            value={item.text}
            onChange={e => updateItem(item.id, 'text', e.target.value)}
            onKeyDown={e => handleKeyDown(e, idx)}
            placeholder="List item…"
            className={`flex-1 bg-transparent text-sm focus:outline-none placeholder-text-muted ${
              item.checked ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          />

          <DelBtn onClick={() => removeItem(item.id)} />
        </div>
      ))}

      {/* Add item button */}
      <button
        onClick={addItem}
        className="flex items-center gap-2 text-text-muted hover:text-accent text-sm transition-colors mt-2 py-1"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// MenuListEditor
// ─────────────────────────────────────────────────────────

/**
 * Simple bullet list editor - text-only items with a dot bullet.
 *
 * Same scoped-ref fix as ChecklistEditor for focus management.
 *
 * @param {{ content: { items: Array }, onChange: Function }} props
 */
export function MenuListEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])
  const containerRef = useRef(null)

  useEffect(() => {
    setItems(content?.items || [])
  }, [content?.items])

  const push = (newItems) => { setItems(newItems); onChange({ items: newItems }) }

  const addItem = () => {
    const newItems = [...items, { id: crypto.randomUUID(), text: '' }]
    push(newItems)

    // Focus last input inside THIS editor
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll('[data-menu-input]')
      inputs?.[inputs.length - 1]?.focus()
    }, 50)
  }

  const updateItem = (id, text) =>
    push(items.map(item => item.id === id ? { ...item, text } : item))

  const removeItem = (id) =>
    push(items.filter(item => item.id !== id))

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace' && items[idx].text === '' && items.length > 1) {
      e.preventDefault()
      push(items.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group py-0.5">
          {/* Bullet dot */}
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-text-muted mt-0.5" />

          <input
            data-menu-input
            value={item.text}
            onChange={e => updateItem(item.id, e.target.value)}
            onKeyDown={e => handleKeyDown(e, idx)}
            placeholder="Item…"
            className="flex-1 bg-transparent text-sm focus:outline-none text-text-primary placeholder-text-muted"
          />

          <DelBtn onClick={() => removeItem(item.id)} />
        </div>
      ))}

      <button
        onClick={addItem}
        className="flex items-center gap-2 text-text-muted hover:text-accent text-sm transition-colors mt-2 py-1"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
  )
}


// ─────────────────────────────────────────────────────────
// CardListEditor
// ─────────────────────────────────────────────────────────

/**
 * Card-based editor - each card has a title and description.
 *
 * @param {{ content: { items: Array }, onChange: Function }} props
 */
export function CardListEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])

  useEffect(() => {
    setItems(content?.items || [])
  }, [content?.items])

  const push = (newItems) => { setItems(newItems); onChange({ items: newItems }) }

  const addItem = () =>
    push([...items, { id: crypto.randomUUID(), title: '', description: '' }])

  const updateItem = (id, field, value) =>
    push(items.map(item => item.id === id ? { ...item, [field]: value } : item))

  const removeItem = (id) =>
    push(items.filter(item => item.id !== id))

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="group bg-bg-elevated border border-bg-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={item.title}
              onChange={e => updateItem(item.id, 'title', e.target.value)}
              placeholder="Title…"
              className="flex-1 bg-transparent text-sm font-semibold focus:outline-none text-text-primary placeholder-text-muted"
            />
            <DelBtn onClick={() => removeItem(item.id)} />
          </div>

          <textarea
            value={item.description}
            onChange={e => updateItem(item.id, 'description', e.target.value)}
            placeholder="Description…"
            rows={2}
            className="w-full bg-transparent text-sm text-text-secondary focus:outline-none placeholder-text-muted resize-none leading-relaxed"
          />
        </div>
      ))}

      <button
        onClick={addItem}
        className="flex items-center gap-2 text-text-muted hover:text-accent text-sm transition-colors py-1"
      >
        <Plus size={14} /> Add card
      </button>
    </div>
  )
}
