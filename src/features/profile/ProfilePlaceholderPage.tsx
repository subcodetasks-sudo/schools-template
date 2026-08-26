import { useTranslation } from 'react-i18next'

type ProfilePlaceholderPageProps = {
  titleKey: string
  bodyKey: string
}

export function ProfilePlaceholderPage({
  titleKey,
  bodyKey,
}: ProfilePlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
        {t(titleKey)}
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
      <p className="mt-8 max-w-xl text-base leading-relaxed text-brand-dark/60">{t(bodyKey)}</p>
    </div>
  )
}
