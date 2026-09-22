import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Camera,
  CreditCard,
  FileBadge,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  Link2,
  Pencil,
  Phone,
  Receipt,
  RefreshCcw,
  UserRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { authFieldClass } from '@/features/auth/AuthShell'
import { getUserInitials } from '@/features/auth/authApi'
import { getErrorMessage } from '@/lib/api'
import { useProfile } from '@/features/profile/ProfileContext'
import {
  editableProfileFields,
  getContactCompleteness,
  profileFieldKeys,
  readOnlyProfileFields,
  type ProfileData,
  type ProfileFieldKey,
} from '@/features/profile/profileData'
import { cn } from '@/lib/utils'

const fields = [
  { key: 'nationalId', icon: IdCard },
  { key: 'studentCode', icon: Hash },
  { key: 'phone', icon: Phone },
  { key: 'religion', icon: BadgeCheck },
  { key: 'registrationStatus', icon: FileBadge },
  { key: 'classNumber', icon: Hash },
  { key: 'transfers', icon: RefreshCcw },
  { key: 'fees', icon: Wallet },
  { key: 'paymentVoucher', icon: Receipt },
  { key: 'paymentDate', icon: CalendarDays },
  { key: 'paymentAmount', icon: CreditCard },
  { key: 'fatherNationalId', icon: IdCard },
  { key: 'fatherAddress', icon: Home },
  { key: 'fatherJob', icon: Briefcase },
  { key: 'fatherPhone', icon: Phone },
  { key: 'guardianName', icon: UserRound },
  { key: 'guardianRelation', icon: Link2 },
  { key: 'guardianNationalId', icon: IdCard },
  { key: 'guardianQualification', icon: GraduationCap },
  { key: 'guardianJob', icon: Briefcase },
  { key: 'guardianAddress', icon: Home },
] as const satisfies ReadonlyArray<{ key: ProfileFieldKey; icon: typeof IdCard }>

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function formatProfileFieldValue(
  key: ProfileFieldKey,
  value: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const raw = value?.trim()
  if (!raw || raw === '—') return '—'

  if (key === 'religion' || key === 'registrationStatus') {
    const lookup = normalizeLookupKey(raw)
    const translationKey = `profile.personal.values.${key}.${lookup}`
    const translated = t(translationKey)
    if (translated !== translationKey) return translated
  }

  return raw
}

const profileSchema = z.object(
  Object.fromEntries(
    profileFieldKeys.map((key) => [
      key,
      editableProfileFields.includes(key) ? z.string() : z.string(),
    ]),
  ) as Record<ProfileFieldKey, z.ZodString>,
)

export function PersonalInfoPage() {
  const { t } = useTranslation()
  const {
    profileData,
    profilePhoto,
    personalName,
    personalInitials,
    isLoading,
    error,
    updateProfile,
    uploadAvatar,
    refreshProfile,
  } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const studentName = personalName || t('profile.studentName')
  const studentInitials = personalInitials || getUserInitials(studentName)
  const contactCompleteness = useMemo(
    () => getContactCompleteness(profileData),
    [profileData],
  )
  const incompleteContactMessage = useMemo(() => {
    if (!contactCompleteness.incomplete) return null
    if (contactCompleteness.fatherIncomplete && contactCompleteness.guardianIncomplete) {
      return t('profile.personal.incompleteContact.both')
    }
    if (contactCompleteness.fatherIncomplete) {
      return t('profile.personal.incompleteContact.father')
    }
    return t('profile.personal.incompleteContact.guardian')
  }, [contactCompleteness, t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileData,
  })

  useEffect(() => {
    reset(profileData)
  }, [profileData, reset])

  useEffect(() => {
    if (isLoading || error || !incompleteContactMessage || isEditing) return
    toast.warning(t('profile.personal.incompleteContact.title'), {
      id: 'profile-incomplete-contact',
      description: incompleteContactMessage,
    })
  }, [error, incompleteContactMessage, isEditing, isLoading, t])

  const startEditing = () => {
    reset(profileData)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    reset(profileData)
    setIsEditing(false)
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setIsUploadingPhoto(true)
      await uploadAvatar(file)
      toast.success(t('profile.personal.photoUploadSuccess'))
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'INVALID_AVATAR_TYPE'
          ? t('profile.personal.invalidPhoto')
          : err instanceof Error && err.message === 'INVALID_AVATAR_SIZE'
            ? t('profile.personal.photoTooLarge')
            : getErrorMessage(err, t('profile.personal.photoUploadError'))
      toast.error(message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateProfile(data)
      setIsEditing(false)
      toast.success(t('profile.personal.saveSuccess'))
    } catch (err) {
      toast.error(getErrorMessage(err, t('profile.personal.saveError')))
    }
  })

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55">
        {t('profile.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshProfile()}
          className="rounded-xl border-brand-dark/15"
        >
          {t('profile.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {isEditing ? t('profile.personal.editTitle') : t('profile.personal.title')}
          <svg
            className="absolute -bottom-0.5 inset-s-0 h-2.5 w-24 text-brand-secondary"
            viewBox="0 0 120 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 8C20 2 40 10 58 6C76 2 96 10 118 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </h1>

        {!isEditing ? (
          <Button
            type="button"
            onClick={startEditing}
            className="h-10 gap-2 rounded-xl bg-brand-primary px-4 text-white hover:bg-brand-dark"
          >
            <Pencil className="size-4" aria-hidden />
            {t('profile.personal.edit')}
          </Button>
        ) : null}
      </div>

      {incompleteContactMessage && !isEditing ? (
        <Alert className="mt-6 border-amber-500/30 bg-amber-50 text-amber-950">
          <AlertTriangle aria-hidden />
          <AlertTitle>{t('profile.personal.incompleteContact.title')}</AlertTitle>
          <AlertDescription>{incompleteContactMessage}</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              size="sm"
              onClick={startEditing}
              className="h-8 gap-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800"
            >
              <Pencil className="size-3.5" aria-hidden />
              {t('profile.personal.incompleteContact.action')}
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {isEditing ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <div className="rounded-2xl border border-brand-dark/10 bg-muted/20 p-5 sm:p-6">
            <p className="text-sm font-medium text-brand-dark">{t('profile.personal.photo')}</p>
            <p className="mt-1 text-sm text-brand-dark/55">{t('profile.personal.photoHint')}</p>

            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-24 ring-4 ring-white shadow-sm">
                <AvatarImage src={profilePhoto} alt={studentName} />
                <AvatarFallback className="text-lg">{studentInitials}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-center gap-2 sm:items-start">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    void handlePhotoChange(event)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 gap-2 rounded-xl border-brand-dark/15"
                >
                  <Camera className="size-4" aria-hidden />
                  {isUploadingPhoto
                    ? t('profile.personal.photoUploading')
                    : t('profile.personal.changePhoto')}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profileFieldKeys.map((key) => {
              const readOnly = readOnlyProfileFields.includes(key)
              const showTranslated = readOnly && key === 'registrationStatus'

              return (
                <div key={key}>
                  <label
                    className="mb-1.5 block text-sm font-medium text-brand-dark"
                    htmlFor={`profile-${key}`}
                  >
                    {t(`profile.personal.fields.${key}.label`)}
                  </label>
                  {showTranslated ? (
                    <input
                      id={`profile-${key}`}
                      disabled
                      value={formatProfileFieldValue(key, profileData[key], t)}
                      className={cn(
                        authFieldClass,
                        'cursor-not-allowed bg-muted/50 text-brand-dark/55',
                      )}
                    />
                  ) : (
                    <input
                      id={`profile-${key}`}
                      disabled={readOnly}
                      className={cn(
                        authFieldClass,
                        readOnly && 'cursor-not-allowed bg-muted/50 text-brand-dark/55',
                      )}
                      {...register(key)}
                    />
                  )}
                  {errors[key] ? (
                    <p className="mt-1 text-xs text-destructive">
                      {t('profile.personal.fieldRequired')}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-brand-dark/10 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              className="h-11 rounded-xl border-brand-dark/15 sm:px-6"
            >
              {t('profile.personal.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-brand-primary text-white hover:bg-brand-dark sm:px-6"
            >
              {t('profile.personal.save')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {fields
            .filter((field) => {
              const isContactField =
                field.key.startsWith('father') || field.key.startsWith('guardian')
              if (!isContactField) return true
              const value = profileData[field.key]?.trim()
              return Boolean(value) && value !== '—'
            })
            .map((field) => (
            <article
              key={field.key}
              className="flex flex-col items-start gap-1.5 rounded-xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
            >
              <field.icon className="size-4 text-brand-primary" aria-hidden />
              <span className="text-xs font-medium text-brand-dark/50">
                {t(`profile.personal.fields.${field.key}.label`)}
              </span>
              <p className="text-sm font-semibold text-brand-dark" dir="auto">
                {formatProfileFieldValue(field.key, profileData[field.key], t)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
