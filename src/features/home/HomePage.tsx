import { AchievementsSection } from '@/features/home/components/AchievementsSection'
import { ApplyCtaSection } from '@/features/home/components/ApplyCtaSection'
// TEMP-HIDDEN-BLOG: import { BlogSection } from '@/features/home/components/BlogSection'
import { EventsSection } from '@/features/home/components/EventsSection'
import { HeroSection } from '@/features/home/components/HeroSection'
// import { TopStudentsSection } from '@/features/home/components/TopStudentsSection'

export function HomePage() {
  return (
    <>
      <HeroSection />
      {/* <TopStudentsSection /> */}
      <AchievementsSection />
      <EventsSection />
      {/* TEMP-HIDDEN-BLOG: <BlogSection /> */}
      <ApplyCtaSection />
    </>
  )
}
