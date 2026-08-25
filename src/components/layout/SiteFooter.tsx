import { useTranslation } from 'react-i18next'

export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt=""
            className="size-11 rounded-full object-cover ring-2 ring-white/20"
          />
          <p className="text-sm font-medium">{t('brand')}</p>
        </div>
        <p className="text-sm text-white/70">
          © {year} · {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
