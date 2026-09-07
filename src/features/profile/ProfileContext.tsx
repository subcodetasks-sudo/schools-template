import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useUserStore } from '@/features/auth/userStore'
import {
  defaultProfileData,
  defaultProfilePhoto,
  type ProfileData,
} from '@/features/profile/profileData'
import {
  getStudentProfile,
  mapPersonalToAuthUser,
  mapPersonalToPhoto,
  mapPersonalToProfileData,
  mapProfileDataToUpdatePayload,
  updateStudentProfile,
  type StudentProfilePayload,
  type StudentSchedule,
  type StudentStatistics,
} from '@/features/profile/studentProfileApi'
import { deleteProfileAvatar, uploadProfileAvatar } from '@/features/profile/mediaApi'

type ProfileContextValue = {
  profileData: ProfileData
  profilePhoto: string
  personalName: string | null
  personalInitials: string | null
  gradeLabel: string | null
  schedule: StudentSchedule
  statistics: StudentStatistics
  isLoading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
  updateProfile: (data: ProfileData) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function applyProfilePayload(
  payload: StudentProfilePayload,
  setProfileData: (data: ProfileData) => void,
  setProfilePhoto: (photo: string) => void,
  setSchedule: (schedule: StudentSchedule) => void,
  setStatistics: (statistics: StudentStatistics) => void,
  setPersonalName: (name: string | null) => void,
  setPersonalInitials: (initials: string | null) => void,
  setGradeLabel: (label: string | null) => void,
  setAuthUser: (user: ReturnType<typeof mapPersonalToAuthUser>) => void,
) {
  setProfileData(mapPersonalToProfileData(payload.personal, defaultProfileData))
  setProfilePhoto(mapPersonalToPhoto(payload.personal))
  setSchedule(payload.schedule ?? null)
  setStatistics(payload.statistics ?? null)
  setPersonalName(payload.personal.name ?? null)
  setPersonalInitials(payload.personal.initials ?? null)
  setGradeLabel(payload.personal.grade_label ?? payload.personal.grade?.name ?? null)
  setAuthUser(mapPersonalToAuthUser(payload.personal))
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const token = useUserStore((state) => state.token)

  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData)
  const [profilePhoto, setProfilePhoto] = useState(defaultProfilePhoto)
  const [personalName, setPersonalName] = useState<string | null>(null)
  const [personalInitials, setPersonalInitials] = useState<string | null>(null)
  const [gradeLabel, setGradeLabel] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<StudentSchedule>(null)
  const [statistics, setStatistics] = useState<StudentStatistics>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncAuthUser = useCallback((user: ReturnType<typeof mapPersonalToAuthUser>) => {
    const state = useUserStore.getState()
    if (!state.token) return
    state.setAuth({
      token: state.token,
      user: {
        ...state.user,
        ...user,
      },
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    const currentToken = useUserStore.getState().token
    if (!currentToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = await getStudentProfile()
      applyProfilePayload(
        payload,
        setProfileData,
        setProfilePhoto,
        setSchedule,
        setStatistics,
        setPersonalName,
        setPersonalInitials,
        setGradeLabel,
        syncAuthUser,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [syncAuthUser])

  useEffect(() => {
    void refreshProfile()
  }, [token, refreshProfile])

  const updateProfile = useCallback(
    async (data: ProfileData) => {
      const payload = await updateStudentProfile(mapProfileDataToUpdatePayload(data))
      applyProfilePayload(
        payload,
        setProfileData,
        setProfilePhoto,
        setSchedule,
        setStatistics,
        setPersonalName,
        setPersonalInitials,
        setGradeLabel,
        syncAuthUser,
      )
    },
    [syncAuthUser],
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      const { url } = await uploadProfileAvatar(file)

      // Student `image` is a string field — persist the exact media URL returned by the API.
      if (url) {
        const payload = await updateStudentProfile({ image: url })
        applyProfilePayload(
          payload,
          setProfileData,
          setProfilePhoto,
          setSchedule,
          setStatistics,
          setPersonalName,
          setPersonalInitials,
          setGradeLabel,
          syncAuthUser,
        )
        return
      }

      await refreshProfile()
    },
    [refreshProfile, syncAuthUser],
  )

  const removeAvatar = useCallback(async () => {
    await deleteProfileAvatar()
    await refreshProfile()
  }, [refreshProfile])

  const value = useMemo(
    () => ({
      profileData,
      profilePhoto,
      personalName,
      personalInitials,
      gradeLabel,
      schedule,
      statistics,
      isLoading,
      error,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    }),
    [
      profileData,
      profilePhoto,
      personalName,
      personalInitials,
      gradeLabel,
      schedule,
      statistics,
      isLoading,
      error,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    ],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
