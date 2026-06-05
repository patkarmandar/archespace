import { useState, useCallback } from 'react'

/**
 * Shared drag-and-drop reorder state for list reordering.
 */
export function useDragReorder({ disabled = false, onDrop }) {
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const reset = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDragStart = useCallback((index) => {
    if (disabled) return
    setDragIndex(index)
  }, [disabled])

  const handleDragOver = useCallback((e, index) => {
    if (disabled) return
    e.preventDefault()
    setDragOverIndex(index)
  }, [disabled])

  const handleDrop = useCallback((index) => {
    if (disabled || dragIndex === null || dragIndex === index) {
      reset()
      return
    }
    onDrop(dragIndex, index)
    reset()
  }, [disabled, dragIndex, onDrop, reset])

  const handleDragEnd = useCallback(() => {
    reset()
  }, [reset])

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
