import { useTranslation } from 'react-i18next'

type SimplePageProps = {
  titleKey: string
  bodyKey: string
}

export function SimplePage({ titleKey, bodyKey }: SimplePageProps) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
        {t(titleKey)}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
    </section>
  )
}
