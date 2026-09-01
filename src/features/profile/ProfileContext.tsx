import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  defaultProfileData,
  defaultProfilePhoto,
  type ProfileData,
} from '@/features/profile/profileData'

type ProfileContextValue = {
  profileData: ProfileData
  profilePhoto: string
  updateProfile: (data: ProfileData, photo: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData)
  const [profilePhoto, setProfilePhoto] = useState(defaultProfilePhoto)

  const value = useMemo(
    () => ({
      profileData,
      profilePhoto,
      updateProfile: (data: ProfileData, photo: string) => {
        setProfileData(data)
        setProfilePhoto(photo)
      },
    }),
    [profileData, profilePhoto],
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
