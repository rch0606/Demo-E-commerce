import { icons as lucideIcons } from 'lucide-react'
import * as faIcons from 'react-icons/fa'
import React from 'react'

const FA_PREFIX = 'fa-'

const Icon: React.FC<{ name: string } & React.SVGAttributes<SVGElement>> = ({ name, ...props }) => {
  if (!name) return null

  let IconComponent = null

  if (name.startsWith(FA_PREFIX)) {
    const faName = name.slice(FA_PREFIX.length)
    IconComponent = (faIcons as any)[faName]
  } else {
    IconComponent = (lucideIcons as any)[name]
  }

  if (!IconComponent) return null

  return <IconComponent {...props} />
}

export default Icon
