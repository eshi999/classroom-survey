import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from './auth-context.ts'
import { getSupabaseClient } from '../lib/supabase.ts'

type AuthProviderProps = {
  children: ReactNode
}

function readAuthConfig(): {
  client: ReturnType<typeof getSupabaseClient> | null
  configError: string | null
} {
  try {
    return { client: getSupabaseClient(), configError: null }
  } catch (error) {
    return {
      client: null,
      configError:
        error instanceof Error ? error.message : 'Supabase is not configured.',
    }
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [{ client, configError }] = useState(readAuthConfig)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(client !== null)

  useEffect(() => {
    if (!client) return

    let active = true
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (!error) setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configError,
      signIn: async (email: string, password: string) => {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      },
      signOut: async () => {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [configError, loading, session],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
