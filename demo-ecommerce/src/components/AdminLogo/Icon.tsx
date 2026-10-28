import { brand } from '@/brand.config'

/** Icône carrée utilisée par Payload quand la place manque. */
export default function Icon() {
  return (
    <img
      src={brand.icon}
      alt={brand.name}
      width={28}
      height={28}
      style={{ objectFit: 'contain', borderRadius: 8 }}
    />
  )
}
