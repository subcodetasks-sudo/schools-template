import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { GroupsPageTitle } from '@/features/groups/components/GroupsShared'
import { NewComplaintTicketForm } from '@/features/complaint-tickets/components/NewComplaintTicketForm'
import { MyComplaintTicketsList } from '@/features/complaint-tickets/components/MyComplaintTicketsList'

export function ComplaintTicketsPage() {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  // Bumped after every successful submit so the history refetches and shows the new ticket.
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreated = useCallback(() => {
    // The new ticket is the newest one, so it lives on page 1.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('page')
        return next
      },
      { replace: true },
    )
    setRefreshKey((key) => key + 1)
  }, [setSearchParams])

  return (
    <div className="w-full">
      <div className="min-w-0">
        <GroupsPageTitle>{t('profile.complaintTickets.title')}</GroupsPageTitle>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/55">
          {t('profile.complaintTickets.subtitle')}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-10">
        <section aria-labelledby="complaint-tickets-new">
          <div className="mb-4">
            <h2 id="complaint-tickets-new" className="text-lg font-bold text-brand-dark">
              {t('profile.complaintTickets.form.heading')}
            </h2>
            <p className="mt-1 flex items-start gap-2 text-sm text-brand-dark/55">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden />
              {t('profile.complaintTickets.form.subtitle')}
            </p>
          </div>
          <NewComplaintTicketForm onCreated={handleCreated} />
        </section>

        <MyComplaintTicketsList refreshKey={refreshKey} />
      </div>
    </div>
  )
}
