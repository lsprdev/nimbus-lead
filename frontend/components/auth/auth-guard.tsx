'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth'

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard/buscar')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || isAuthenticated) {
    return <FullPageLoader />
  }

  return children
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return <FullPageLoader />
  }

  return children
}

function FullPageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Spinner />
    </main>
  )
}
