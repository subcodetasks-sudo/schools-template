import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Camera,
  CreditCard,
  FileBadge,
  Hash,
  Home,
  IdCard,
  Pencil,
  Phone,
  Receipt,
  RefreshCcw,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { authFieldClass } from '@/features/auth/AuthShell'
import { useProfile } from '@/features/profile/ProfileContext'
import {
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
] as const satisfies ReadonlyArray<{ key: ProfileFieldKey; icon: typeof IdCard }>

const profileSchema = z.object(
  Object.fromEntries(profileFieldKeys.map((key) => [key, z.string().min(1)])) as Record<
    ProfileFieldKey,
    z.ZodString
  >,
)

export function PersonalInfoPage() {
  const { t } = useTranslation()
  const { profileData, profilePhoto, updateProfile } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [draftPhoto, setDraftPhoto] = useState(profilePhoto)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (isEditing) {
      reset(profileData)
      setDraftPhoto(profilePhoto)
    }
  }, [isEditing, profileData, profilePhoto, reset])

  const startEditing = () => {
    setIsEditing(true)
  }

  const cancelEditing = () => {
    reset(profileData)
    setDraftPhoto(profilePhoto)
    setIsEditing(false)
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.personal.invalidPhoto'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftPhoto(reader.result)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    updateProfile(data, draftPhoto)
    setIsEditing(false)
    toast.success(t('profile.personal.saveSuccess'))
  })

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

      {isEditing ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <div className="rounded-2xl border border-brand-dark/10 bg-muted/20 p-5 sm:p-6">
            <p className="text-sm font-medium text-brand-dark">{t('profile.personal.photo')}</p>
            <p className="mt-1 text-sm text-brand-dark/55">{t('profile.personal.photoHint')}</p>

            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-24 ring-4 ring-white shadow-sm">
                <AvatarImage src={draftPhoto} alt={t('profile.studentName')} />
                <AvatarFallback className="text-lg">{t('profile.studentInitials')}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-center gap-2 sm:items-start">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 gap-2 rounded-xl border-brand-dark/15"
                >
                  <Camera className="size-4" aria-hidden />
                  {t('profile.personal.changePhoto')}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profileFieldKeys.map((key) => {
              const readOnly = readOnlyProfileFields.includes(key)

              return (
                <div key={key}>
                  <label
                    className="mb-1.5 block text-sm font-medium text-brand-dark"
                    htmlFor={`profile-${key}`}
                  >
                    {t(`profile.personal.fields.${key}.label`)}
                  </label>
                  <input
                    id={`profile-${key}`}
                    disabled={readOnly}
                    className={cn(
                      authFieldClass,
                      readOnly && 'cursor-not-allowed bg-muted/50 text-brand-dark/55',
                    )}
                    {...register(key)}
                  />
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
          {fields.map((field) => (
            <article
              key={field.key}
              className="flex flex-col items-start gap-1.5 rounded-xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
            >
              <field.icon className="size-4 text-brand-primary" aria-hidden />
              <span className="text-xs font-medium text-brand-dark/50">
                {t(`profile.personal.fields.${field.key}.label`)}
              </span>
              <p className="text-sm font-semibold text-brand-dark" dir="auto">
                {profileData[field.key]}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
