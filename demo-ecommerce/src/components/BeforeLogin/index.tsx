import React from 'react'

import { brand } from '@/brand.config'

/**
 * Panneau de marque de la page de connexion (moitié gauche sur grand écran).
 * Le placement en écran partagé est géré par custom.scss via
 * `.template-minimal:has(.brand-login-panel)` : le formulaire de Payload
 * reste intact.
 */
const BeforeLogin: React.FC = () => {
  return (
    <aside className="brand-login-panel" aria-hidden="true">
      <span className="brand-login-panel__bubble brand-login-panel__bubble--1" />
      <span className="brand-login-panel__bubble brand-login-panel__bubble--2" />
      <span className="brand-login-panel__bubble brand-login-panel__bubble--3" />

      <div className="brand-login-panel__content">
        <img src={brand.logo} alt="" className="brand-login-panel__logo" />
        <p className="brand-login-panel__title">{brand.adminTitle}</p>
        <p className="brand-login-panel__text">
          Commandes, stock, avis et statistiques de la boutique, au même endroit.
        </p>
      </div>
    </aside>
  )
}

export default BeforeLogin
