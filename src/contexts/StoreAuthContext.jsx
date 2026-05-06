import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const StoreAuthCtx = createContext({})

export function StoreAuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadProfile(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/loja` },
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (!error && data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, name, email, role: 'customer' })
    }
    return { data, error }
  }

  const signOut = () => supabase.auth.signOut()

  const saveProfile = async (fields) => {
    if (!user) return { error: new Error('Não autenticado') }
    const payload = { id: user.id, ...fields, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('profiles').upsert(payload)
    if (!error) {
      setProfile(p => ({ ...p, ...fields }))
      // Sincroniza com tabela de clientes
      await syncCustomer(user.id, fields)
    }
    return { error }
  }

  const syncCustomer = async (uid, fields) => {
    // Verifica conflito de telefone com clientes existentes
    if (!fields.phone) return
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', fields.phone)
      .maybeSingle()

    if (existing) {
      await supabase.from('profiles').update({ customer_id: existing.id }).eq('id', uid)
    } else {
      // Cria novo cliente se não existe
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ name: fields.name || '', phone: fields.phone })
        .select('id')
        .single()
      if (newCustomer) {
        await supabase.from('profiles').update({ customer_id: newCustomer.id }).eq('id', uid)
      }
    }
  }

  const saveOrder = async (items, total) => {
    if (!user) return
    await supabase.from('store_orders').insert({ profile_id: user.id, items, total })
  }

  return (
    <StoreAuthCtx.Provider value={{
      user, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, saveProfile, saveOrder,
    }}>
      {children}
    </StoreAuthCtx.Provider>
  )
}

export const useStoreAuth = () => useContext(StoreAuthCtx)
