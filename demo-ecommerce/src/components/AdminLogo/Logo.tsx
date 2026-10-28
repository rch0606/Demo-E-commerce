import { brand } from '@/brand.config'

export default function Logo() {
  return (
    <img
      src={brand.logo}
      alt={brand.name}
      style={{
        width: '183px',
        objectFit: 'contain',
      }}
    />
  )
}
