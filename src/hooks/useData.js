import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCollections() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    const channel = supabase.channel('collections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        qc.invalidateQueries({ queryKey: ['collections'] })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [qc])

  const create = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('collections')
        .insert({ name, description, user_id: user.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, name, description }) => {
      const { data, error } = await supabase
        .from('collections')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collections').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  return { ...query, create, update, remove }
}

export function useCollectionItems(collectionId) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['items', collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_items')
        .select('*')
        .eq('collection_id', collectionId)
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!collectionId,
  })

  useEffect(() => {
    if (!collectionId) return
    const channel = supabase.channel(`items-${collectionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collection_items',
        filter: `collection_id=eq.${collectionId}`
      }, () => {
        qc.invalidateQueries({ queryKey: ['items', collectionId] })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [collectionId, qc])

  const create = useMutation({
    mutationFn: async ({ type, title }) => {
      const items = query.data || []
      const position = items.length
      const defaultContent = {
        textbox: { text: '' },
        checkbox_list: { items: [] },
        menu_list: { items: [] },
        card_list: { items: [] },
      }
      const { data, error } = await supabase
        .from('collection_items')
        .insert({ collection_id: collectionId, type, title: title || '', content: defaultContent[type], position })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, title, content }) => {
      const { data, error } = await supabase
        .from('collection_items')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collection_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  return { ...query, create, update, remove }
}
