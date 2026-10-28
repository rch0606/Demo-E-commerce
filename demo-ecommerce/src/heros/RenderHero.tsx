import React from 'react'
import { HomeHero } from './HomeHero/Component'

interface HeroProps {
  type?: 'homeHero' | 'none'
  homeHero?: any
  [key: string]: any
}

const heroes = {
  homeHero: HomeHero,
}


export const RenderHero: React.FC<HeroProps> = (props) => {
  const { type } = props || {}

  if (!type || type === 'none') return null

  const HeroToRender = heroes[type as keyof typeof heroes]

  if (!HeroToRender) return null

  if (type === 'homeHero') {
    return <HeroToRender {...props.homeHero} />
  }

  return <HeroToRender {...props} />
}