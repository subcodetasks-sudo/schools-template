import { PdfDocumentTemplate } from '@/components/pdf/PdfDocumentTemplate'
import {
  findComponent,
  type CertificateComponentColumn,
  type SuccessCertificateSubjectRow,
  type SuccessCertificateTerm,
} from '@/features/profile/successCertificateApi'

const TERM_AR: Record<string, string> = {
  first: 'الفصل الدراسي الأول',
  second: 'الفصل الدراسي الثاني',
}

const COLOR_AR: Record<string, { label: string; meaning: string; range: string; hex: string }> = {
  blue: { label: 'أزرق', meaning: 'يفوق التوقعات', range: '85% - 100%', hex: '#0284c7' },
  green: { label: 'أخضر', meaning: 'يلبي التوقعات', range: '65% - 84%', hex: '#059669' },
  yellow: { label: 'أصفر', meaning: 'يلبي التوقعات أحيانا', range: '50% - 64%', hex: '#d97706' },
  red: { label: 'أحمر', meaning: 'أقل من المتوقع', range: '0% - 49%', hex: '#e11d48' },
}

const STATUS_AR: Record<string, string> = {
  pass: 'ناجح',
  fail: 'راسب',
  incomplete: 'غير مكتمل',
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function formatScoreWithMax(
  score: number | null | undefined,
  max: number | null | undefined,
) {
  if (score === null || score === undefined) return '—'
  if (max === null || max === undefined) return formatScore(score)
  return `${formatScore(score)} / ${formatScore(max)}`
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}%`
}

export type SuccessCertificatePdfProps = {
  studentName: string
  studentCode: string
  academicYear: string
  term: SuccessCertificateTerm | string
  subjects: SuccessCertificateSubjectRow[]
  componentColumns: CertificateComponentColumn[]
}

export function SuccessCertificatePdf({
  studentName,
  studentCode,
  academicYear,
  term,
  subjects,
  componentColumns,
}: SuccessCertificatePdfProps) {
  const termLabel = TERM_AR[String(term)] ?? String(term)
  const documentTitle = `استمارة تقييم طالب — ${termLabel} — العام الدراسي ${academicYear}`

  return (
    <PdfDocumentTemplate
      documentTitle={documentTitle}
      schoolLogoSrc="/logo.jpeg"
      pageClassName="pdf-template-page--landscape"
    >
      <div className="pdf-template-period pdf-template-period--compact">
        <table className="pdf-template-table pdf-template-table--summary pdf-template-table--fit">
          <tbody>
            <tr>
              <th>اسم الطالب</th>
              <td>{studentName}</td>
              <th>كود الطالب</th>
              <td className="pdf-template-cell-ltr">{studentCode}</td>
              <th>العام الدراسي</th>
              <td className="pdf-template-cell-ltr">{academicYear}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 8,
          fontSize: 11,
        }}
      >
        {(['blue', 'green', 'yellow', 'red'] as const).map((color) => {
          const item = COLOR_AR[color]
          return (
            <div
              key={color}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #0e4f73',
                borderRadius: 4,
                padding: '3px 6px',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: item.hex,
                  flexShrink: 0,
                }}
              />
              <span>
                <strong>{item.label}</strong>
                {' — '}
                {item.meaning} ({item.range})
              </span>
            </div>
          )
        })}
      </div>

      <table className="pdf-template-table pdf-template-table--fit">
        <thead>
          <tr>
            <th>المادة</th>
            {componentColumns.map((column) => (
              <th key={column.key}>{column.name}</th>
            ))}
            <th>المجموع</th>
            <th>النسبة</th>
            <th>اللون</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((row, index) => {
            const colorKey = String(row.evaluation?.color || '').toLowerCase()
            const colorMeta = COLOR_AR[colorKey]
            const colorLabel =
              row.evaluation?.color_ar?.trim() || colorMeta?.label || row.evaluation?.color || '—'
            const statusKey = String(row.status || '').toLowerCase()

            return (
              <tr key={`${row.subject?.id ?? index}`}>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                  {row.subject?.name?.trim() || '—'}
                </td>
                {componentColumns.map((column) => {
                  const component = findComponent(row, column.key)
                  return (
                    <td key={column.key} className="pdf-template-cell-ltr">
                      {formatScoreWithMax(component?.score, component?.max)}
                    </td>
                  )
                })}
                <td className="pdf-template-cell-ltr">
                  {formatScoreWithMax(row.total, row.total_max)}
                </td>
                <td className="pdf-template-cell-ltr">{formatPercentage(row.percentage)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      minWidth: 42,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: colorMeta?.hex ?? '#64748b',
                      color: '#fff',
                      fontSize: 10,
                    }}
                  >
                    {colorLabel}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {STATUS_AR[statusKey] ?? row.status ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pdf-template-signatures">
        <div className="pdf-template-sign" data-signer="affairsVice">
          <p className="pdf-template-sign-title">مسئول الحاسب الآلي</p>
          <div className="pdf-template-sign-space" aria-hidden />
        </div>
        <div className="pdf-template-sign" data-signer="schoolVice">
          <p className="pdf-template-sign-title">رئيس لجنة النظام والمراقبة</p>
          <div className="pdf-template-sign-space" aria-hidden />
        </div>
        <div className="pdf-template-sign" data-signer="principal">
          <p className="pdf-template-sign-title">مدير المدرسة</p>
          <div className="pdf-template-sign-space" aria-hidden />
        </div>
      </div>
    </PdfDocumentTemplate>
  )
}
