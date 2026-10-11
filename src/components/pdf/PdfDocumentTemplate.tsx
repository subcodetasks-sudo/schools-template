import type { CSSProperties, ReactNode } from 'react'
import './pdf-document-template.css'

type PdfDocumentTemplateProps = {
  children?: ReactNode
  schoolName?: string
  documentTitle?: string
  schoolLogoSrc?: string
  ministryLogoSrc?: string
  pageClassName?: string
  pageStyle?: CSSProperties
}

export function PdfDocumentTemplate({
  children,
  schoolName = 'مدرسة المنصورة المتميزة للغات 2',
  documentTitle,
  schoolLogoSrc = '/logo.jpeg',
  ministryLogoSrc,
  pageClassName,
  pageStyle,
}: PdfDocumentTemplateProps) {
  return (
    <div
      className={['pdf-template-page', pageClassName].filter(Boolean).join(' ')}
      style={pageStyle}
      dir="rtl"
    >
      <header className="pdf-template-header">
        <div className="pdf-template-logo-box">
          <img src={schoolLogoSrc} alt="شعار المدرسة" />
          {ministryLogoSrc ? <img src={ministryLogoSrc} alt="شعار وزارة التربية والتعليم" /> : null}
        </div>
        <div className="pdf-template-authority" dir="rtl">
          <p>محافظة الدقهلية</p>
          <p>مديرية التربية والتعليم بالدقهلية</p>
          <p>إدارة غرب المنصورة التعليمية</p>
          <p className="pdf-template-authority-school">{schoolName}</p>
        </div>
      </header>

      <div className="pdf-template-header-line" />

      <main className="pdf-template-content">
        {documentTitle ? (
          <div className="pdf-template-document-title">
            <h2>{documentTitle}</h2>
          </div>
        ) : null}
        {children}
      </main>

      <div className="pdf-template-footer-line" />
      <div className="pdf-template-footer-accent" />
    </div>
  )
}
