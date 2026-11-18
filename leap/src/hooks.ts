import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from './components/ui'

/** Server-state read: every page loads through the api layer so the PHP backend can replace it later. */
export const useApi = <T,>(key: string, fn: () => T | Promise<T>) => useQuery({ queryKey: [key], queryFn: async () => fn(), retry: false })

/** Mutation that shows a toast and refreshes all cached data on success. */
export function useAction<A>(fn: (arg: A) => unknown | Promise<unknown>, okText: string) {
  const qc = useQueryClient(); const toast = useToast()
  return useMutation({ mutationFn: async (a: A) => fn(a), onSuccess: () => { toast(okText); qc.invalidateQueries() }, onError: (e: Error) => toast(e.message, true) })
}
