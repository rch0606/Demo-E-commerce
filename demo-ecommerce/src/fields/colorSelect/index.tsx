import { Field } from 'payload'

export const colorSelect = ({
  name = 'color',
  label = 'Color',
  required = false,
}: {
  name?: string
  label?: string
  required?: boolean
} = {}): Field => ({
  name,
  type: 'select',
  label,
  required,
  defaultValue: '#EC4899',
  options: [
    { label: '🌸 Pink', value: '#EC4899' },
    { label: '🟣 Purple', value: '#8B5CF6' },
    { label: '💚 Green', value: '#10B981' },
    { label: '⭐ Gold', value: '#F59E0B' },
    { label: '💛 Yellow', value: '#FBBF24' },
    { label: '🟠 Orange', value: '#FB923C' },
    { label: '❤️ Red', value: '#F87171' },
    { label: '💙 Blue', value: '#60A5FA' },
    { label: '🤍 White', value: '#FFFFFF' },
    { label: '🩶 Gray', value: '#9CA3AF' },
  ],
})