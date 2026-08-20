import { getSupabaseClient } from './client'
import type { CreateNodePayload, NodeRecord, UpdateNodePayload } from '@/types'

type CreateNodeInsert = CreateNodePayload & { user_id: string }

export async function fetchNodes(userId: string): Promise<NodeRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('nodes')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as NodeRecord[]
}

export async function createNode(payload: CreateNodeInsert): Promise<NodeRecord> {
  const { data, error } = await getSupabaseClient().from('nodes').insert(payload).select().single()
  if (error) throw error
  return data as NodeRecord
}

export async function updateNode(id: string, patch: UpdateNodePayload): Promise<void> {
  const { error } = await getSupabaseClient().from('nodes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteNodeCascade(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('nodes').delete().eq('id', id)
  if (error) throw error
}

export async function reparentNode(id: string, newParentId: string | null, sortOrder: number): Promise<void> {
  await updateNode(id, { parent_id: newParentId, sort_order: sortOrder })
}

export async function searchNodes(userId: string, query: string): Promise<NodeRecord[]> {
  const sanitizedQuery = query.replace(/[,%]/g, '').trim()
  if (!sanitizedQuery) return []

  const { data, error } = await getSupabaseClient()
    .from('nodes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)

  if (error) throw error
  return (data ?? []) as NodeRecord[]
}
