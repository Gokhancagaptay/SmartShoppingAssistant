import { useQuery } from 'react-query'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import axios from 'axios'
import { useAuth } from './useAuth'

export function useRole() {
  const { user, loading: authLoading } = useAuth()

  const { data } = useQuery(
    ['current-user-role', user?.uid],
    async () => {
      const token = await getAuth(app).currentUser!.getIdToken()
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data as { role: string }
    },
    {
      enabled: !!user && !authLoading,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    }
  )

  return {
    role: data?.role ?? null,
    isAdmin: data?.role === 'admin',
  }
}
