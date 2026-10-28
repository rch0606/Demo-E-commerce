import {
  Package,
  Sparkles,
  Tags,
  TrendingUp,
  History,
  Globe,
} from "lucide-react"
import { MetricCard, SectionTitle } from "./shared"



function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value || 0))
}

export function SeoDashboard({
  stats,
  user,
}: {
  stats: any
  user: any
}) {
  return (
    <>
      <section className="ph-hero">
        <div className="ph-hero__content">

          <div className="ph-hero__eyebrow">
            <Sparkles size={16} />
            Dashboard SEO
          </div>

          <h2>
            Bonjour {user?.name || "Utilisateur"} 👋
          </h2>

          <p>
            Suivi de la qualité du catalogue et optimisation SEO.
          </p>

          <div className="ph-hero__chips">

            <span className="ph-chip">
              <Package size={14} />
              {stats.totalProducts} produits
            </span>

            <span className="ph-chip">
              <Tags size={14} />
              {stats.totalCategories} catégories
            </span>

          </div>

        </div>
      </section>


      <div className="dash-kpi-grid">

        <div className="dash-kpi-card">
          <div className="dash-kpi-icon dash-kpi-icon--purple">
             
          </div>

          <div>
            <p className="dash-kpi-label">
              Produits
            </p>

            <p className="dash-kpi-value">
              {stats.totalProducts}
            </p>
          </div>
        </div>


        <div className="dash-kpi-card">
          <div className="dash-kpi-icon dash-kpi-icon--teal">
            🗂️
          </div>

          <div>
            <p className="dash-kpi-label">
              Catégories
            </p>

            <p className="dash-kpi-value">
              {stats.totalCategories}
            </p>
          </div>
        </div>


        <div className="dash-kpi-card">
          <div className="dash-kpi-icon dash-kpi-icon--orange">
            ⚠️
          </div>

          <div>
            <p className="dash-kpi-label">
              Sans catégorie
            </p>

            <p className="dash-kpi-value">
              {stats.productsWithoutCategories}
            </p>
          </div>
        </div>

      </div>


      <section className="ph-section">

        <SectionTitle
          icon={TrendingUp}
          title="Qualité catalogue SEO"
        />


        <div className="ph-grid ph-grid--4">

          <MetricCard
            icon={Package}
            label="Sans image"
            value={formatNumber(stats.productsWithoutImage)}
            note="Produits à compléter"
          />


          <MetricCard
            icon={History}
            label="Sans description"
            value={formatNumber(stats.productsWithoutDescription)}
          />


          <MetricCard
            icon={Globe}
            label="Sans SEO"
            value={formatNumber(stats.productsWithoutSEO)}
          />


          <MetricCard
            icon={Tags}
            label="Catégories vides"
            value={formatNumber(stats.emptyCategories)}
          />

        </div>

      </section>
    </>
  )
}