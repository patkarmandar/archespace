import { useState, useCallback, useRef } from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'

function useDebounce(fn, delay = 600) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

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

export function TextboxEditor({ content, onChange }) {
  const [text, setText] = useState(content?.text || '')
  const save = useDebounce(val => onChange({ text: val }))

  const handleChange = (e) => {
    setText(e.target.value)
    save(e.target.value)
  }

  return (
    <textarea
      value={text}
      onChange={handleChange}
      placeholder="Start writing anything…"
      rows={6}
      className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-y min-h-[120px] font-sans leading-relaxed"
    />
  )
}

export function ChecklistEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])

  const push = (newItems) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  const addItem = () => {
    const newItems = [...items, { id: crypto.randomUUID(), text: '', checked: false }]
    push(newItems)
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-checklist-input]')
      inputs[inputs.length - 1]?.focus()
    }, 50)
  }

  const updateItem = (id, field, value) => {
    push(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id) => push(items.filter(item => item.id !== id))

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace' && items[idx].text === '' && items.length > 1) {
      e.preventDefault()
      push(items.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group py-0.5">
          <button
            onClick={() => updateItem(item.id, 'checked', !item.checked)}
            className="shrink-0 text-text-muted hover:text-accent transition-colors"
          >
            {item.checked
              ? <CheckSquare size={17} className="text-accent" />
              : <Square size={17} />
            }
          </button>
          <input
            data-checklist-input
            value={item.text}
            onChange={e => updateItem(item.id, 'text', e.target.value)}
            onKeyDown={e => handleKeyDown(e, idx)}
            placeholder="List item…"
            className={`flex-1 bg-transparent text-sm focus:outline-none transition-colors placeholder-text-muted ${
              item.checked ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
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

export function MenuListEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])

  const push = (newItems) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  const addItem = () => {
    const newItems = [...items, { id: crypto.randomUUID(), text: '' }]
    push(newItems)
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-menu-input]')
      inputs[inputs.length - 1]?.focus()
    }, 50)
  }

  const updateItem = (id, text) => push(items.map(item => item.id === id ? { ...item, text } : item))
  const removeItem = (id) => push(items.filter(item => item.id !== id))

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace' && items[idx].text === '' && items.length > 1) {
      e.preventDefault()
      push(items.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group py-0.5">
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-text-muted" />
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

export function CardListEditor({ content, onChange }) {
  const [items, setItems] = useState(content?.items || [])

  const push = (newItems) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  const addItem = () => {
    push([...items, { id: crypto.randomUUID(), title: '', description: '' }])
  }

  const updateItem = (id, field, value) => {
    push(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id) => push(items.filter(item => item.id !== id))

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
