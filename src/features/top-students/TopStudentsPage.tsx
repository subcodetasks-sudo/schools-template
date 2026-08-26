import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopStudentCard, type TopStudent } from '@/features/home/components/TopStudentCard'
import { usePagination } from '@/lib/usePagination'

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

function StudentsGrid({ students }: { students: TopStudent[] }) {
  const { page, setPage, pageCount, current } = usePagination(students, 9)

  return (
    <div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {current.map((student) => (
          <TopStudentCard key={student.id} student={student} />
        ))}
      </div>

      <Pagination
        className="mt-12"
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  )
}

export function TopStudentsPage() {
  const { t, i18n } = useTranslation()
  const [stage, setStage] = useState<Stage>('primary')

  const studentsByStage = useMemo(() => {
    const build = (stageKey: Stage): TopStudent[] =>
      Array.from({ length: 3 }, (_, copy) =>
        stageOrder[stageKey].map((key, index) => ({
          id: `${stageKey}-${key}-${copy}`,
          name: t(`topStudents.students.${key}`),
          image: studentImages[key],
          rank: copy * stageOrder[stageKey].length + index + 1,
        })),
      ).flat()

    return {
      primary: build('primary'),
      prep: build('prep'),
      secondary: build('secondary'),
    }
  }, [t, i18n.language])

  return (
    <section className="pb-16">
      <PageBanner
        title={t('topStudents.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.topStudents') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Tabs
          value={stage}
          onValueChange={(value) => {
            if (stages.includes(value as Stage)) setStage(value as Stage)
          }}
          className="gap-10"
        >
          <TabsList
            variant="line"
            className="mx-auto h-auto w-fit gap-5 bg-transparent p-0"
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

          {stages.map((item) => (
            <TabsContent key={item} value={item} className="outline-none">
              <StudentsGrid students={studentsByStage[item]} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
