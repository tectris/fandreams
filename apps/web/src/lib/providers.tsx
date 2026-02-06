'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: '#1A1A2E',
            border: '1px solid #2D2D44',
            color: '#F5F5F5',
          },
        }}
      />
    </QueryClientProvider>
  )
}
