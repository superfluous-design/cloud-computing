import { makeWorker } from '@livestore/adapter-web/worker'
import { makeSyncBackend } from '@livestore/sync-electric'

import { schema } from './schema.ts'

makeWorker({
  schema,
  sync: {
    backend: makeSyncBackend({
      endpoint: '/api/electric',
    }),
  },
})
