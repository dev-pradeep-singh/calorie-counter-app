import { useQuery } from '@tanstack/react-query'
import { api, ApiError, type Profile } from '../lib/api'
import { useAuth } from './AuthProvider'

/** The signed-in user's profile; `null` means they haven't finished onboarding yet. */
export function useProfile() {
  const { session } = useAuth()
  return useQuery<Profile | null>({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      try {
        return await api.getProfile()
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
  })
}
