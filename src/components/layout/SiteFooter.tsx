import { useState, type FormEvent, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1Z" />
    </svg>
  )
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.3 10.8 18.7 4.5h-1.3l-4.7 5.5L9 4.5H4.5l5.7 8.3L4.5 19.5H5.8l5-5.8 4 5.8H19.5l-6.2-8.7Zm-1.8 2.1-.6-.8-4.6-6.6h2l3.7 5.4.6.8 4.8 7h-2l-3.9-5.8Z" />
    </svg>
  )
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M6.9 9.3H4.2V19.5h2.7V9.3ZM5.6 4.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM19.8 12.7c0-2.2-1.2-3.6-3.4-3.6-1.1 0-2 .5-2.5 1.3h-.1V9.3h-2.6c0 .5 0 10.2 0 10.2h2.6v-5.7c0-.3 0-.6.1-.8.3-.6.9-1.2 1.9-1.2 1.3 0 1.9.9 1.9 2.3v5.4h2.7v-5.9Z" />
    </svg>
  )
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 7.4A4.6 4.6 0 1 0 12 16.6 4.6 4.6 0 0 0 12 7.4Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 4.8c-2 0-2.2 0-3 .1-.8 0-1.3.2-1.8.4a3.6 3.6 0 0 0-1.3 1.3c-.2.5-.4 1-.4 1.8 0 .8-.1 1-.1 3s0 2.2.1 3c0 .8.2 1.3.4 1.8.3.5.7 1 1.3 1.3.5.2 1 .4 1.8.4.8 0 1 .1 3 .1s2.2 0 3-.1c.8 0 1.3-.2 1.8-.4a3.6 3.6 0 0 0 1.3-1.3c.2-.5.4-1 .4-1.8 0-.8.1-1 .1-3s0-2.2-.1-3c0-.8-.2-1.3-.4-1.8a3.6 3.6 0 0 0-1.3-1.3c-.5-.2-1-.4-1.8-.4-.8 0-1-.1-3-.1Zm0-1.6c2 0 2.3 0 3.1.1 1 0 1.7.2 2.3.5.6.2 1.2.6 1.7 1.1.5.5.9 1.1 1.1 1.7.3.6.4 1.3.5 2.3 0 .8.1 1.1.1 3.1s0 2.3-.1 3.1c0 1-.2 1.7-.5 2.3a4.7 4.7 0 0 1-1.1 1.7 4.7 4.7 0 0 1-1.7 1.1c-.6.3-1.3.4-2.3.5-.8 0-1.1.1-3.1.1s-2.3 0-3.1-.1c-1 0-1.7-.2-2.3-.5a4.7 4.7 0 0 1-1.7-1.1 4.7 4.7 0 0 1-1.1-1.7c-.3-.6-.4-1.3-.5-2.3 0-.8-.1-1.1-.1-3.1s0-2.3.1-3.1c0-1 .2-1.7.5-2.3.2-.6.6-1.2 1.1-1.7.5-.5 1.1-.9 1.7-1.1.6-.3 1.3-.4 2.3-.5.8 0 1.1-.1 3.1-.1Z" />
    </svg>
  )
}

function FooterHeading({ children }: { children: string }) {
  return (
    <h3 className="relative mb-5 inline-block pb-2 text-base font-bold text-brand-dark">
      {children}
      <svg
        className="absolute -bottom-0.5 inset-s-0 h-2.5 w-16 text-brand-secondary"
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
    </h3>
  )
}

const importantLinks = [
  { to: '/', key: 'home' },
  { to: '/top-students', key: 'topStudents' },
  { to: '/achievements', key: 'achievements' },
  { to: '/events', key: 'events' },
  { to: '/blog', key: 'blog' },
  { to: '/contact', key: 'contact' },
  { to: '/terms-of-applying', key: 'termsOfApplying' },
] as const

const socials = [
  { icon: FacebookIcon, label: 'Facebook', href: '#' },
  { icon: XIcon, label: 'X', href: '#' },
  { icon: LinkedInIcon, label: 'LinkedIn', href: '#' },
  { icon: InstagramIcon, label: 'Instagram', href: '#' },
] as const

export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const [email, setEmail] = useState('')

  const onSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    toast.success(t('footer.subscribeSuccess'))
    setEmail('')
  }

  return (
    <footer className="bg-background text-brand-dark">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-start lg:col-span-3">
            <Link to="/" className="mb-5 inline-flex">
              <img
                src="/logo.jpeg"
                alt={t('brand')}
                className="size-20 rounded-full object-cover shadow-sm ring-2 ring-brand-muted/60"
              />
            </Link>
            <form
              onSubmit={onSubscribe}
              className="flex flex-col w-full items-center gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                className="box-border h-12 w-full min-w-0 rounded-xl border border-brand-dark/15 bg-white px-3 text-sm text-brand-dark shadow-sm outline-none placeholder:text-brand-dark/40 focus:border-brand-primary"
                required
              />
              <Button
                type="submit"
                className="h-12 w-full shrink-0 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {t('footer.subscribe')}
              </Button>
            </form>
          </div>

          <div className="flex flex-col items-center text-center sm:items-start sm:text-start lg:col-span-3">
            <FooterHeading>{t('footer.importantLinks')}</FooterHeading>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {importantLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.to}
                    className="text-sm text-brand-dark/60 transition-colors hover:text-brand-primary"
                  >
                    {t(`footer.links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center text-center sm:items-start sm:text-start lg:col-span-3">
            <FooterHeading>{t('footer.contactTitle')}</FooterHeading>
            <ul className="space-y-3">
              <li className="flex items-start justify-center gap-2.5 text-sm text-brand-dark/65 sm:justify-start">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden />
                <span>{t('footer.address')}</span>
              </li>
              <li className="flex items-center justify-center gap-2.5 text-sm text-brand-dark/65 sm:justify-start">
                <Phone className="size-4 shrink-0 text-brand-primary" aria-hidden />
                <a href="tel:+201001234567" className="hover:text-brand-primary" dir="ltr">
                  {t('footer.phone')}
                </a>
              </li>
              <li className="flex items-center justify-center gap-2.5 text-sm text-brand-dark/65 sm:justify-start">
                <Mail className="size-4 shrink-0 text-brand-primary" aria-hidden />
                <a
                  href={`mailto:${t('footer.email')}`}
                  className="hover:text-brand-primary"
                  dir="ltr"
                >
                  {t('footer.email')}
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-brand-muted/50 bg-white shadow-sm">
              <iframe
                title={t('footer.mapTitle')}
                src="https://maps.google.com/maps?q=Mansoura%2C%20Egypt&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="h-44 w-full border-0 grayscale-20 sm:h-48"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-sm text-brand-dark/55">
            © {year} · {t('footer.rights')}
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-full text-brand-primary transition-colors hover:bg-brand-primary/10',
                )}
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
