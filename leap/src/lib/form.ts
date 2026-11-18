import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

/** Typed react-hook-form + Zod helper so submit handlers receive validated, correctly typed data. */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, values?: z.infer<S>) {
  return useForm<z.infer<S>>({ resolver: zodResolver(schema) as Resolver<z.infer<S>>, values })
}
