import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, ShieldCheck } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import {
  classifyIntroductionCardError,
  getIntroductionCard,
  type IntroductionCard,
  type IntroductionCardErrorKind,
} from '@/features/introduction-card/introductionCardApi'
import {
  GroupsEmptyState,
  GroupsLoadingState,
  GroupsPageTitle,
} from '@/features/groups/components/GroupsShared'
import { AddEntriesForm } from '@/features/introduction-card/components/AddEntriesForm'
import { EntryCard } from '@/features/introduction-card/components/EntryCard'
import {
  IntroductionCardErrorState,
  StudentHeader,
} from '@/features/introduction-card/components/IntroductionCardShared'

type LoadError = { kind: IntroductionCardErrorKind; message: string }
type LoadResult = { card: IntroductionCard | null; error: LoadError | null }

export function IntroductionCardPage() {
  const { t, i18n } = useTranslation()
  const [card, setCard] = useState<IntroductionCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<LoadError | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Bumped on every successful save so a GET that started earlier cannot overwrite fresher data.
  const saveVersionRef = useRef(0)
  const hasCardRef = useRef(false)

  /** Pure fetch: resolves to the next state instead of setting it, so the effect owns all updates. */
  const loadCard = useCallback(async (): Promise<LoadResult> => {
    try {
      return { card: await getIntroductionCard(), error: null }
    } catch (err) {
      return {
        card: null,
        error: {
          kind: classifyIntroductionCardError(err),
          message: getErrorMessage(err, t('profile.introductionCard.errors.loadError')),
        },
      }
    }
  }, [t])

  useEffect(() => {
    // Ignore responses that arrive after unmount or after a newer request (retry / language change).
    let ignore = false
    const version = saveVersionRef.current
    void loadCard().then((result) => {
      if (ignore || version !== saveVersionRef.current) return
      // A failed background refetch (e.g. language switch) keeps the loaded card and any drafts on screen.
      if (result.card || !hasCardRef.current) {
        hasCardRef.current = Boolean(result.card)
        setCard(result.card)
        setError(result.error)
      }
      setIsLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [loadCard, reloadKey])

  const retry = () => {
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const handleSaved = useCallback((next: IntroductionCard) => {
    saveVersionRef.current += 1
    hasCardRef.current = true
    setCard(next)
    setError(null)
  }, [])

  const header = (
    <div className="min-w-0">
      <GroupsPageTitle>{t('profile.introductionCard.title')}</GroupsPageTitle>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/55">
        {t('profile.introductionCard.subtitle')}
      </p>
    </div>
  )

  if (isLoading) {
    return (
      <div className="w-full">
        {header}
        <div className="mt-8">
          <GroupsLoadingState />
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="w-full">
        {header}
        <div className="mt-8">
          <IntroductionCardErrorState
            kind={error?.kind ?? 'generic'}
            message={error?.message}
            onRetry={retry}
          />
        </div>
      </div>
    )
  }

  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'

  return (
    <div className="w-full">
      {header}

      <div className="mt-8 flex flex-col gap-10">
        <section aria-labelledby="introduction-card-student">
          <h2 id="introduction-card-student" className="sr-only">
            {t('profile.introductionCard.student.title')}
          </h2>
          <StudentHeader student={card.student} />
        </section>

        <section aria-labelledby="introduction-card-entries">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="introduction-card-entries" className="text-lg font-bold text-brand-dark">
              {t('profile.introductionCard.list.title')}
            </h2>
            {card.items.length > 0 ? (
              <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                {t('profile.introductionCard.list.count', {
                  value: new Intl.NumberFormat(locale).format(card.items.length),
                })}
              </span>
            ) : null}
          </div>

          {card.items.length === 0 ? (
            <GroupsEmptyState
              compact
              icon={ClipboardList}
              title={t('profile.introductionCard.list.emptyTitle')}
              description={t('profile.introductionCard.list.emptyDescription')}
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {card.items.map((entry, index) => (
                <li key={entry.id || `entry-${index}`} className="min-w-0">
                  <EntryCard
                    entry={entry}
                    isEditing={Boolean(entry.id) && editingId === entry.id}
                    onEdit={() => setEditingId(entry.id)}
                    onCancel={() => setEditingId(null)}
                    onSaved={(next) => {
                      handleSaved(next)
                      // Only close this entry's editor — another one may have been opened meanwhile.
                      setEditingId((current) => (current === entry.id ? null : current))
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="introduction-card-add">
          <div className="mb-4">
            <h2 id="introduction-card-add" className="text-lg font-bold text-brand-dark">
              {t('profile.introductionCard.form.addTitle')}
            </h2>
            <p className="mt-1 flex items-start gap-2 text-sm text-brand-dark/55">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden />
              {t('profile.introductionCard.form.addSubtitle')}
            </p>
          </div>
          <AddEntriesForm onSaved={handleSaved} />
        </section>
      </div>
    </div>
  )
}
