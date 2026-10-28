import { lexicalEditor, FixedToolbarFeature, InlineToolbarFeature, OrderedListFeature, UnorderedListFeature, ItalicFeature, UnderlineFeature, LinkFeature, HeadingFeature, BlocksFeature } from '@payloadcms/richtext-lexical'
import { Block } from 'payload'
import { MediaBlock } from '../MediaBlock/config'
import { CallToAction } from '../CallToAction/config'

export const RichTextBlock : Block = {
  slug: 'richTextBlock',
  interfaceName : 'RichTextBlockType',
  labels: {
    singular: 'Rich Text',
    plural: 'Rich Texts',
  },
  fields: [
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
          OrderedListFeature(),
          UnorderedListFeature(),
          ItalicFeature(),
          UnderlineFeature(),
          LinkFeature(),
          BlocksFeature({
            blocks: [
              CallToAction ,
                // CustomCTA,
                MediaBlock,
            ]
        })
        ],
      }),
      required: true,
    },
  ],
}
