import React from "react"


export const SectionTitle = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
}) => (
  <div className="ph-section-head">

    <div className="ph-section-head__title">
      <Icon className="ph-section-head__icon" />
      <h3>{title}</h3>
    </div>

    {subtitle && (
      <p className="ph-section-head__subtitle">
        {subtitle}
      </p>
    )}

  </div>
)



export const MetricCard = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "ph-tone-default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  note?: string
  tone?: string
}) => (
  <article className={`ph-metric-card ${tone}`}>

    <div className="ph-metric-card__icon">
      <Icon className="ph-metric-card__icon-svg" />
    </div>


    <div className="ph-metric-card__body">

      <div className="ph-metric-card__header">
        <span className="ph-metric-card__label">
          {label}
        </span>
      </div>


      <div className="ph-metric-card__value">
        {value}
      </div>


      {note && (
        <div className="ph-metric-card__note">
          {note}
        </div>
      )}

    </div>

  </article>
)