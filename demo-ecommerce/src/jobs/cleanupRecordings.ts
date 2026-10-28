import type { TaskConfig } from 'payload'

import { purgeOldRecordings, RETENTION_DAYS } from '../utilities/recordStorage'

/**
 * Supprime chaque nuit les enregistrements d'écran (rrweb) de plus de
 * RETENTION_DAYS jours : un dossier par jour dans uploads/record.
 */
export const cleanupRecordings = {
  slug: 'cleanupRecordings',

  outputSchema: [
    {
      name: 'message',
      type: 'text',
      required: true,
    },
  ],

  schedule: [
    {
      cron: '0 3 * * *', // chaque nuit à 03:00
      queue: 'maintenance',
    },
  ],

  retries: 1,

  handler: async ({ req }: { req: { payload: any } }) => {
    const { deletedFolders, freedBytes } = purgeOldRecordings()

    const message = deletedFolders.length
      ? `Enregistrements de plus de ${RETENTION_DAYS} jours supprimés : ${deletedFolders.join(', ')} (${(freedBytes / 1024 / 1024).toFixed(1)} Mo libérés)`
      : `Aucun enregistrement de plus de ${RETENTION_DAYS} jours`

    req.payload.logger.info(`[cleanupRecordings] ${message}`)

    return { output: { message } }
  },
} as unknown as TaskConfig
