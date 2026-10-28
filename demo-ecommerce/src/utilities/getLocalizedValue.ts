import { Locale } from "@/lib/i18n"

export const getLocalizedValue = (field: any, locale: Locale): string => {
  if (!field) return ''
  if (typeof field === 'object') {
    return field[locale] || field.fr || field.en || Object.values(field)[0] || ''
  }
  return field
}
