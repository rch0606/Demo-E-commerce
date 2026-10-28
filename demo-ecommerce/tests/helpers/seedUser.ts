// tests/helpers/seedUser.ts
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  name: 'Dev User',
  role: 'admin' as const, // Add 'as const' to make it a literal type
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  try {
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: testUser.email,
        },
      },
    })

    if (existingUsers.docs.length > 0) {
      await payload.delete({
        collection: 'users',
        id: existingUsers.docs[0].id,
      })
    }
  } catch (error) {
    // Ignore if user doesn't exist
  }

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: {
      ...testUser,
      role: testUser.role as 'admin' | 'sales' | 'seo', // Type assertion
    },
    overrideAccess: true,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  try {
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: testUser.email,
        },
      },
    })

    if (existingUsers.docs.length > 0) {
      await payload.delete({
        collection: 'users',
        id: existingUsers.docs[0].id,
      })
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}