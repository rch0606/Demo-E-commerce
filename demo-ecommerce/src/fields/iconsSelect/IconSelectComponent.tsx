'use client'
// Icon Select Component for Payload CMS
import React, { useState, useEffect, useMemo } from 'react'
import { icons as lucideIcons } from 'lucide-react' 
import * as faIcons from 'react-icons/fa'            
import { FieldLabel, Select, useField } from '@payloadcms/ui'
import { TextFieldClientProps } from 'payload'

// Prefix to identify FontAwesome icons
const FA_PREFIX = 'fa-'

const IconSelectComponent: React.FC<TextFieldClientProps> = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path: path || field.name })

  const [filteredIcons, setFilteredIcons] = useState<string[]>([])
  const { label, required } = field

  useEffect(() => {
    // Get Lucide icon names as is
    const lucideNames = Object.keys(lucideIcons)
    // Get FontAwesome icon names prefixed by FA_PREFIX
    const faNames = Object.keys(faIcons)?.map((name) => FA_PREFIX + name)
    // Combine both sets
    setFilteredIcons([...lucideNames, ...faNames])
  }, [])

  const handleSearch = (inputValue: string) => {
    const lucideNames = Object.keys(lucideIcons)
    const faNames = Object.keys(faIcons)?.map((name) => FA_PREFIX + name)
    const combined = [...lucideNames, ...faNames]
    const filtered = combined.filter((icon) =>
      icon.toLowerCase().includes(inputValue.toLowerCase()),
    )
    setFilteredIcons(filtered)
  }

  const handleChange = (selectedOption: unknown) => {
    if (!selectedOption || Array.isArray(selectedOption) || typeof selectedOption !== 'object') {
      setValue('')
      return
    }

    const nextValue = 'value' in selectedOption ? selectedOption.value : ''
    setValue(typeof nextValue === 'string' ? nextValue : '')
  }

  const options = useMemo(() => {
    return filteredIcons && filteredIcons?.map((iconName) => {
      let iconPreview = null
      try {
        if (iconName.startsWith(FA_PREFIX)) {
          // FontAwesome icon, remove prefix and render
          const faIconName = iconName.slice(FA_PREFIX.length)
          iconPreview = React.createElement((faIcons as any)[faIconName], { size: 24 })
        } else {
          // Lucide icon
          iconPreview = React.createElement((lucideIcons as any)[iconName], { size: 24 })
        }
      } catch (e) {
        console.error(`Failed to render icon ${iconName}:`, e)
        iconPreview = <span className="text-red-500" style={{ color: 'var(--dt-danger-text)' }}>[Icon Error]</span>
      }

      return {
        label: (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 10 }} aria-hidden="true">
              {iconPreview}
            </span>
            {iconName}
          </div>
        ),
        value: iconName,
      }
    })
  }, [filteredIcons])

  return (
    <div className="field-type">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${path}`} label={label} required={required} />
        <Select
          value={options.find((option) => option.value === value)}
          onChange={handleChange}
          options={options}
          onInputChange={handleSearch}
          placeholder="Search for an icon"
          isSearchable
          aria-label="Icon selection dropdown"
          noOptionsMessage={() => 'No icons found'}
          isClearable
        />
      </div>
    </div>
  )
}

export default IconSelectComponent
