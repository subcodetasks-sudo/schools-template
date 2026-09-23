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
  type StudentCallup,
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
  stageName: string | null
  gradeName: string | null
  classroomLabel: string | null
  schedule: StudentSchedule
  statistics: StudentStatistics
  callups: StudentCallup[]
  isLoading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
  updateProfile: (data: ProfileData) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function normalizeCallups(callups: StudentCallup[] | null | undefined) {
  return Array.isArray(callups) ? callups : []
}

function applyProfilePayload(
  payload: StudentProfilePayload,
  setters: {
    setProfileData: (data: ProfileData) => void
    setProfilePhoto: (photo: string) => void
    setSchedule: (schedule: StudentSchedule) => void
    setStatistics: (statistics: StudentStatistics) => void
    setCallups: (callups: StudentCallup[]) => void
    setPersonalName: (name: string | null) => void
    setPersonalInitials: (initials: string | null) => void
    setGradeLabel: (label: string | null) => void
    setStageName: (name: string | null) => void
    setGradeName: (name: string | null) => void
    setClassroomLabel: (label: string | null) => void
    setAuthUser: (user: ReturnType<typeof mapPersonalToAuthUser>) => void
  },
) {
  setters.setProfileData(mapPersonalToProfileData(payload.personal, defaultProfileData))
  setters.setProfilePhoto(mapPersonalToPhoto(payload.personal))
  setters.setSchedule(payload.schedule ?? null)
  setters.setStatistics(payload.statistics ?? null)
  setters.setCallups(normalizeCallups(payload.callups))
  setters.setPersonalName(payload.personal.name ?? null)
  setters.setPersonalInitials(payload.personal.initials ?? null)
  setters.setGradeLabel(payload.personal.grade_label ?? payload.personal.grade?.name ?? null)
  setters.setStageName(payload.personal.stage?.name?.trim() || null)
  setters.setGradeName(payload.personal.grade?.name?.trim() || null)
  setters.setClassroomLabel(
    payload.personal.classroom?.section?.trim() ||
      payload.personal.classroom?.label?.trim() ||
      null,
  )
  setters.setAuthUser(mapPersonalToAuthUser(payload.personal))
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const token = useUserStore((state) => state.token)

  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData)
  const [profilePhoto, setProfilePhoto] = useState(defaultProfilePhoto)
  const [personalName, setPersonalName] = useState<string | null>(null)
  const [personalInitials, setPersonalInitials] = useState<string | null>(null)
  const [gradeLabel, setGradeLabel] = useState<string | null>(null)
  const [stageName, setStageName] = useState<string | null>(null)
  const [gradeName, setGradeName] = useState<string | null>(null)
  const [classroomLabel, setClassroomLabel] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<StudentSchedule>(null)
  const [statistics, setStatistics] = useState<StudentStatistics>(null)
  const [callups, setCallups] = useState<StudentCallup[]>([])
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

  const payloadSetters = useMemo(
    () => ({
      setProfileData,
      setProfilePhoto,
      setSchedule,
      setStatistics,
      setCallups,
      setPersonalName,
      setPersonalInitials,
      setGradeLabel,
      setStageName,
      setGradeName,
      setClassroomLabel,
      setAuthUser: syncAuthUser,
    }),
    [syncAuthUser],
  )

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
      applyProfilePayload(payload, payloadSetters)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [payloadSetters])

  useEffect(() => {
    void refreshProfile()
  }, [token, refreshProfile])

  const updateProfile = useCallback(
    async (data: ProfileData) => {
      const payload = await updateStudentProfile(mapProfileDataToUpdatePayload(data))
      applyProfilePayload(payload, payloadSetters)
    },
    [payloadSetters],
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      const { url } = await uploadProfileAvatar(file)

      // Student `image` is a string field — persist the exact media URL returned by the API.
      if (url) {
        const payload = await updateStudentProfile(
          mapProfileDataToUpdatePayload(profileData, url),
        )
        applyProfilePayload(payload, payloadSetters)
        return
      }

      await refreshProfile()
    },
    [payloadSetters, profileData, refreshProfile],
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
      stageName,
      gradeName,
      classroomLabel,
      schedule,
      statistics,
      callups,
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
      stageName,
      gradeName,
      classroomLabel,
      schedule,
      statistics,
      callups,
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
