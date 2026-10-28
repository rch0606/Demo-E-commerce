import { TextField } from 'payload'

type IconsSelectType = (overrides?: Partial<TextField>) => TextField
export const iconsSelect: IconsSelectType = (overrides = {}) => {
  // @ts-expect-error - ts mismatch Partial<TextField> with TextField
  const iconsSelect: TextField = {
    name: 'icon',
    label: 'Icon',
    type: 'text',
    ...(overrides || {}),
    hooks: {},
    admin: {
      ...(overrides?.admin || {}),
      components: {
        Field: '@/fields/iconsSelect/IconSelectComponent',
      },
    },
  }
  return iconsSelect
}