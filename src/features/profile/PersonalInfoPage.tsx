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
  FileText,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  RefreshCcw,
  Upload,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { authFieldClass } from '@/features/auth/AuthShell'
import { getUserInitials } from '@/features/auth/authApi'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { useProfile } from '@/features/profile/ProfileContext'
import {
  addressProfileFields,
  getContactCompleteness,
  profileFieldKeys,
  readOnlyProfileFields,
  requiredContactFields,
  type ProfileData,
  type ProfileFieldKey,
} from '@/features/profile/profileData'
import {
  mapApiFieldToProfileKey,
  studentDocumentCollections,
  type StudentDocumentCollection,
  type StudentDocumentFile,
  type StudentDocumentUploads,
} from '@/features/profile/studentProfileApi'
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
  { key: 'guardianRelation', icon: Users },
  { key: 'guardianNationalId', icon: IdCard },
  { key: 'guardianQualification', icon: GraduationCap },
  { key: 'guardianJob', icon: Briefcase },
  { key: 'guardianAddress', icon: Home },
] as const satisfies ReadonlyArray<{ key: ProfileFieldKey; icon: typeof IdCard }>

const addressFields = [
  { key: 'governorate', icon: MapPin },
  { key: 'district', icon: MapPin },
  { key: 'city', icon: MapPin },
  { key: 'area', icon: MapPin },
  { key: 'detailedAddress', icon: Home },
  { key: 'alternativePhone', icon: Phone },
] as const satisfies ReadonlyArray<{ key: ProfileFieldKey; icon: typeof MapPin }>

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DOCUMENT_TYPES = new Set([...PHOTO_TYPES, 'application/pdf'])
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
const addressFieldSet = new Set<ProfileFieldKey>(addressProfileFields)

function emptyDocumentUploads(): StudentDocumentUploads {
  return {
    student_photo: [],
    birth_certificate: [],
    father_id_card: [],
    mother_id_card: [],
  }
}

function acceptForCollection(collection: StudentDocumentCollection) {
  return collection === 'student_photo'
    ? 'image/jpeg,image/png,image/webp'
    : 'image/jpeg,image/png,image/webp,application/pdf'
}

function assertDocumentFile(collection: StudentDocumentCollection, file: File) {
  const allowed = collection === 'student_photo' ? PHOTO_TYPES : DOCUMENT_TYPES
  if (!allowed.has(file.type)) throw new Error('INVALID_DOCUMENT_TYPE')
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('INVALID_DOCUMENT_SIZE')
}

const INCOMPLETE_TOAST_ID = 'profile-incomplete-contact'

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isEmptyDisplayValue(value: string) {
  const raw = value?.trim()
  return !raw || raw === '—'
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

function firstValidationMessage(error: unknown) {
  const fieldErrors = getFieldErrors(error)
  if (!fieldErrors) return undefined

  for (const messages of Object.values(fieldErrors)) {
    const first = Array.isArray(messages) ? messages[0] : messages
    if (typeof first === 'string' && first.trim()) return first
  }

  return undefined
}

const requiredContactFieldSet = new Set<ProfileFieldKey>(requiredContactFields)

const profileSchema = z.object(
  Object.fromEntries(
    profileFieldKeys.map((key) => [
      key,
      requiredContactFieldSet.has(key) ? z.string().trim().min(1) : z.string(),
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
    documents,
  } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [pendingDocuments, setPendingDocuments] = useState<StudentDocumentUploads>(
    emptyDocumentUploads,
  )
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
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileData,
    shouldFocusError: true,
  })

  useEffect(() => {
    reset(profileData)
  }, [profileData, reset])

  useEffect(() => {
    if (isLoading || error || !incompleteContactMessage || isEditing) return
    toast.warning(t('profile.personal.incompleteContact.title'), {
      id: INCOMPLETE_TOAST_ID,
      description: incompleteContactMessage,
    })
  }, [error, incompleteContactMessage, isEditing, isLoading, t])

  const startEditing = () => {
    reset(profileData)
    setPendingDocuments(emptyDocumentUploads())
    setIsEditing(true)
  }

  const cancelEditing = () => {
    reset(profileData)
    setPendingDocuments(emptyDocumentUploads())
    setIsEditing(false)
  }

  const addDocumentFiles = (collection: StudentDocumentCollection, fileList: FileList | null) => {
    if (!fileList?.length) return
    try {
      const next = Array.from(fileList)
      next.forEach((file) => assertDocumentFile(collection, file))
      setPendingDocuments((current) => ({
        ...current,
        [collection]: [...(current[collection] ?? []), ...next],
      }))
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'INVALID_DOCUMENT_TYPE'
          ? t('profile.personal.documents.invalidType')
          : err instanceof Error && err.message === 'INVALID_DOCUMENT_SIZE'
            ? t('profile.personal.documents.tooLarge')
            : t('profile.personal.documents.invalidType')
      toast.error(message)
    }
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

  const showMissingFieldsToast = (keys: ProfileFieldKey[]) => {
    const unique = [...new Set(keys)]
    if (unique.length === 0) return
    toast.error(t('profile.personal.completeRequiredFields'), {
      description: t('profile.personal.validationFailed', {
        fields: unique.map((key) => t(`profile.personal.fields.${key}.label`)).join('، '),
      }),
    })
  }

  const onSubmit = handleSubmit(
    async (data) => {
      const missing = getContactCompleteness(data).missingFields
      if (missing.length > 0) {
        missing.forEach((key) => {
          setError(key, { type: 'required', message: t('profile.personal.fieldRequired') })
        })
        setFocus(missing[0])
        showMissingFieldsToast(missing)
        return
      }

      try {
        await updateProfile(data, pendingDocuments)
        setPendingDocuments(emptyDocumentUploads())
        setIsEditing(false)
        toast.success(t('profile.personal.saveSuccess'))
      } catch (err) {
        const fieldErrors = getFieldErrors(err)
        const failedFields = Object.keys(fieldErrors ?? {})
          .map((field) => mapApiFieldToProfileKey(field))
          .filter((key): key is ProfileFieldKey => Boolean(key))

        failedFields.forEach((key) => {
          setError(key, { type: 'server', message: t('profile.personal.fieldRequired') })
        })
        if (failedFields[0]) setFocus(failedFields[0])

        if (failedFields.length > 0) {
          showMissingFieldsToast(failedFields)
          return
        }

        toast.error(
          firstValidationMessage(err) ?? getErrorMessage(err, t('profile.personal.saveError')),
        )
      }
    },
    (formErrors) => {
      const missing = requiredContactFields.filter((key) => formErrors[key])
      if (missing[0]) setFocus(missing[0])
      showMissingFieldsToast(missing)
    },
  )

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

  const visibleFields = isEditing
    ? fields
    : fields.filter((field) => {
        if (field.key.startsWith('father') || field.key.startsWith('guardian')) {
          return !isEmptyDisplayValue(profileData[field.key])
        }
        return true
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
            {contactCompleteness.incomplete
              ? t('profile.personal.incompleteContact.action')
              : t('profile.personal.edit')}
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
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-8">
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
            {profileFieldKeys.filter((key) => !addressFieldSet.has(key)).map((key) => {
              const readOnly = readOnlyProfileFields.includes(key)
              const required = requiredContactFieldSet.has(key)
              const showTranslated =
                readOnly && (key === 'religion' || key === 'registrationStatus')

              return (
                <div key={key}>
                  <label
                    className="mb-1.5 block text-sm font-medium text-brand-dark"
                    htmlFor={`profile-${key}`}
                  >
                    {t(`profile.personal.fields.${key}.label`)}
                    {required ? (
                      <span className="ms-1 text-destructive" aria-hidden>
                        *
                      </span>
                    ) : null}
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
                      aria-invalid={Boolean(errors[key])}
                      className={cn(
                        authFieldClass,
                        readOnly && 'cursor-not-allowed bg-muted/50 text-brand-dark/55',
                        errors[key] && 'border-destructive/50 focus-visible:ring-destructive/30',
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

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-brand-dark">
              {t('profile.personal.address.title')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {addressProfileFields.map((key) => (
                <div key={key} className={key === 'detailedAddress' ? 'sm:col-span-2' : undefined}>
                  <label
                    className="mb-1.5 block text-sm font-medium text-brand-dark"
                    htmlFor={`profile-${key}`}
                  >
                    {t(`profile.personal.fields.${key}.label`)}
                  </label>
                  <input
                    id={`profile-${key}`}
                    aria-invalid={Boolean(errors[key])}
                    className={cn(
                      authFieldClass,
                      errors[key] && 'border-destructive/50 focus-visible:ring-destructive/30',
                    )}
                    {...register(key)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-brand-dark">
                {t('profile.personal.documents.title')}
              </h2>
              <p className="mt-1 text-sm text-brand-dark/55">
                {t('profile.personal.documents.hint')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {studentDocumentCollections.map((collection) => (
                <DocumentSlot
                  key={collection}
                  collection={collection}
                  existing={documents[collection]}
                  pending={pendingDocuments[collection] ?? []}
                  onAdd={(files) => addDocumentFiles(collection, files)}
                />
              ))}
            </div>
          </section>

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
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {visibleFields.map((field) => (
              <article
                key={field.key}
                className="flex flex-col items-start gap-1.5 rounded-2xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
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

          <section>
            <h2 className="mb-3 text-lg font-bold text-brand-dark">
              {t('profile.personal.address.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {addressFields
                .filter((field) => !isEmptyDisplayValue(profileData[field.key]))
                .map((field) => (
                  <article
                    key={field.key}
                    className="flex flex-col items-start gap-1.5 rounded-2xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
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
            {addressFields.every((field) => isEmptyDisplayValue(profileData[field.key])) ? (
              <p className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-8 text-center text-sm text-brand-dark/45">
                {t('profile.personal.address.empty')}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-brand-dark">
              {t('profile.personal.documents.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {studentDocumentCollections.map((collection) => (
                <article
                  key={collection}
                  className="rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-brand-dark">
                    {t(`profile.personal.documents.collections.${collection}`)}
                  </p>
                  <DocumentList files={documents[collection]} />
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function DocumentList({ files }: { files: StudentDocumentFile[] }) {
  const { t } = useTranslation()
  if (files.length === 0) {
    return (
      <p className="mt-2 text-sm text-brand-dark/45">{t('profile.personal.documents.empty')}</p>
    )
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {files.map((file, index) => {
        const href = file.urls?.original?.trim()
        const name = file.fileName?.trim() || t('profile.personal.documents.unnamed')
        return (
          <li key={`${file.id ?? name}-${index}`}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
              >
                <FileText className="size-3.5" aria-hidden />
                {name}
                {file.size ? (
                  <span className="text-xs font-normal text-brand-dark/45">{file.size}</span>
                ) : null}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-brand-dark">
                <FileText className="size-3.5" aria-hidden />
                {name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function DocumentSlot({
  collection,
  existing,
  pending,
  onAdd,
}: {
  collection: StudentDocumentCollection
  existing: StudentDocumentFile[]
  pending: File[]
  onAdd: (files: FileList | null) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-2xl border border-brand-dark/10 bg-muted/20 p-4">
      <p className="text-sm font-semibold text-brand-dark">
        {t(`profile.personal.documents.collections.${collection}`)}
      </p>
      <DocumentList files={existing} />
      {pending.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {pending.map((file, index) => (
            <li key={`${file.name}-${index}`} className="text-xs text-brand-dark/60">
              + {file.name}
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={acceptForCollection(collection)}
        className="hidden"
        multiple
        onChange={(event) => {
          onAdd(event.target.files)
          event.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="mt-3 h-9 gap-2 rounded-xl border-brand-dark/15"
      >
        <Upload className="size-3.5" aria-hidden />
        {t('profile.personal.documents.add')}
      </Button>
    </div>
  )
}
