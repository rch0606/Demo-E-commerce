import React, { Fragment } from 'react'

import type { Page, Product } from '@/payload-types'

import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { HomeFeatures } from './HomeFeatures/Component'
import { HomeCategories } from './HomeCategories/Component'
import { HomeProducts } from './HomeProducts/Component'
import { HomeShowcase } from './Homeshowcase/Component'
import { HomeCollectionsComponent } from './HomeCollection/Component'
import { HomeSeasons } from './HomeSeasons/Component'
import { HomeTestimonials } from './HomeTestimonials/Component'
import { HomePromoComponent } from './HomePromo/Component'
import { RichTextBlock } from './RichTextBlock/Component'
import { HomeCallToActionBlock } from './Home CTA/Component'
import { HomeFAQ } from './HomeFAQ/Component'

const blockComponents = {
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  homeFeatures: HomeFeatures,
  homeCategories: HomeCategories,
  homeProducts: HomeProducts,
  homeShowcase: HomeShowcase,
  homeCollections: HomeCollectionsComponent,
  homeSeasons: HomeSeasons,
  homeTestimonials : HomeTestimonials,
  homePromo: HomePromoComponent,
  richTextBlock: RichTextBlock,
  homeCTA :  HomeCallToActionBlock,
  homeFAQ  : HomeFAQ

} as const

type BlockType = keyof typeof blockComponents

export const RenderBlocks: React.FC<{
  blocks: Page['layout']
  allProducts?: Product[]
}> = ({ blocks, allProducts = [] }) => {
  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (!hasBlocks) {
    return null
  }

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const blockType = block.blockType as string

        if (blockType && blockType in blockComponents) {
          const Block = blockComponents[blockType as BlockType]

          if (blockType === 'homeShowcase' || blockType === 'homeProducts') {
            return (
              <div  key={index}>
                {/* @ts-expect-error payload block typing */}
                <Block {...block} allProducts={allProducts} />
              </div>
            )
          }

          return (
            <div  key={index}>
              {/* @ts-expect-error payload block typing */}
              <Block {...block} disableInnerContainer />
            </div>
          )
        }

        return null
      })}
    </Fragment>
  )
}