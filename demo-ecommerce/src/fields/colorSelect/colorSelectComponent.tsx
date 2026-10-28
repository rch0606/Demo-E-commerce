'use client'

import React from 'react'
import { FieldLabel, Select, useField } from '@payloadcms/ui'
import type { SelectFieldClientProps } from 'payload'

type ColorOption = {
  label: string
  value: string
}

const colorOptions: ColorOption[] = [
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
]

// Map colors to background classes for the admin UI preview
const colorPreviewStyles: Record<string, { bg: string, text: string }> = {
  '#EC4899': { bg: 'bg-pink-500', text: 'text-white' },
  '#8B5CF6': { bg: 'bg-purple-500', text: 'text-white' },
  '#10B981': { bg: 'bg-green-500', text: 'text-white' },
  '#F59E0B': { bg: 'bg-amber-500', text: 'text-white' },
  '#FBBF24': { bg: 'bg-yellow-400', text: 'text-black' },
  '#FB923C': { bg: 'bg-orange-400', text: 'text-black' },
  '#F87171': { bg: 'bg-red-400', text: 'text-black' },
  '#60A5FA': { bg: 'bg-blue-400', text: 'text-black' },
  '#FFFFFF': { bg: 'bg-white', text: 'text-black' },
  '#9CA3AF': { bg: 'bg-gray-400', text: 'text-black' },
}

const ColorSelectComponent: React.FC<SelectFieldClientProps> = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path: path || field.name })
  const { label, required } = field

  const handleChange = (selectedOption: unknown) => {
    if (!selectedOption || Array.isArray(selectedOption) || typeof selectedOption !== 'object') {
      setValue('')
      return
    }

    const nextValue = 'value' in selectedOption ? selectedOption.value : ''
    setValue(typeof nextValue === 'string' ? nextValue : '')
  }

  const getOptionLabel = (option: ColorOption) => {
    const styles = colorPreviewStyles[option.value]
    if (styles) {
      return (
        <div className="flex items-center gap-2">
          <span 
            className={`inline-block h-4 w-4 rounded-full ${styles.bg} ${styles.text} text-[8px] flex items-center justify-center`}
          >
            ✓
          </span>
          <span>{option.label}</span>
          <span className="text-xs text-gray-400" style={{ color: 'var(--dt-text-muted)' }}>{option.value}</span>
        </div>
      )
    }
    return option.label
  }

  return (
    <div className="field-type">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${path}`} label={label} required={required} />
        <Select
          value={colorOptions.find((option) => option.value === value) || undefined}
          onChange={handleChange}
          options={colorOptions.map(option => ({
            ...option,
            label: getOptionLabel(option)
          }))}
          placeholder="Select a color"
          aria-label="Color selection dropdown"
          isClearable
        />
      </div>
    </div>
  )
}

export default ColorSelectComponent