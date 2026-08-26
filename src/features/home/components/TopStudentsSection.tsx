import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeader } from '@/components/SectionHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { TopStudentCard, type TopStudent } from '@/features/home/components/TopStudentCard'
import { cn } from '@/lib/utils'

const stages = ['primary', 'prep', 'secondary'] as const
type Stage = (typeof stages)[number]

const studentImages = {
  s1: '/student-1.png',
  s2: '/student-2.png',
  s3: '/student-3.png',
  s4: '/student-4.jpg',
} as const

const stageOrder: Record<Stage, Array<keyof typeof studentImages>> = {
  primary: ['s1', 's2', 's3', 's4'],
  prep: ['s2', 's1', 's4', 's3'],
  secondary: ['s3', 's4', 's1', 's2'],
}

function StudentsCarousel({ students, dir }: { students: TopStudent[]; dir: 'rtl' | 'ltr' }) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  useEffect(() => {
    if (!api) return

    const sync = () => {
      setSelected(api.selectedScrollSnap())
      setScrollSnaps(api.scrollSnapList())
    }

    sync()
    api.on('select', sync)
    api.on('reInit', sync)
    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  return (
    <div className="space-y-10">
      <Carousel
        key={`${dir}-${students[0]?.id ?? 'empty'}`}
        setApi={setApi}
        opts={{
          align: 'start',
          direction: dir,
          containScroll: 'trimSnaps',
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent >
          {students.map((student) => (
            <CarouselItem
              key={student.id}
              className="basis-[75%]  sm:basis-1/2 md:basis-1/3  "
            >
              <TopStudentCard student={student} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {scrollSnaps.length > 1 ? (
        <div
          className="flex items-center justify-center gap-2.5"
          role="tablist"
          aria-label="Carousel pages"
        >
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-1.5 w-7 rounded-[1px] transition-colors',
                selected === index
                  ? 'bg-brand-primary'
                  : 'bg-black/10 hover:bg-black/20',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function TopStudentsSection() {
  const { t, i18n } = useTranslation()
  const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'
  const [stage, setStage] = useState<Stage>('primary')

  const studentsByStage = useMemo(() => {
    const build = (stageKey: Stage): TopStudent[] =>
      stageOrder[stageKey].map((key, index) => ({
        id: `${stageKey}-${key}`,
        name: t(`topStudents.students.${key}`),
        image: studentImages[key],
        rank: index + 1,
      }))

    return {
      primary: build('primary'),
      prep: build('prep'),
      secondary: build('secondary'),
    }
  }, [t, i18n.language])

  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Tabs
          value={stage}
          onValueChange={(value) => {
            if (stages.includes(value as Stage)) setStage(value as Stage)
          }}
          className="gap-12"
        >
          <SectionHeader
            title={t('topStudents.title')}
            accent={t('topStudents.accent')}
            viewAllTo="/top-students"
            actions={
              <TabsList
                variant="line"
                className="h-auto gap-5 bg-transparent p-0"
              >
                {stages.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    className="rounded-none px-0.5 pb-2 text-[15px] font-medium text-brand-dark/50 after:h-[3px] after:bg-brand-primary data-active:bg-transparent data-active:text-brand-dark data-active:shadow-none"
                  >
                    {t(`topStudents.stages.${item}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
          />

          {stages.map((item) => (
            <TabsContent key={item} value={item} className="outline-none">
              <StudentsCarousel students={studentsByStage[item]} dir={dir} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
