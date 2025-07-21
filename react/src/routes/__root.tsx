import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from '@livestore/react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { ErrorBoundary } from 'react-error-boundary'

import { schema } from '../livestore/schema'

import LiveStoreWorker from '../livestore/worker.ts?worker'

const RootComponent = () => {
  const storeId = getStoreId()
  const adapter = makePersistedAdapter({
    storage: { type: 'opfs' },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
  })

  return (
    <RootDocument>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <LiveStoreProvider
          schema={schema}
          storeId={storeId}
          renderLoading={() => <div>Loading...</div>}
          adapter={adapter}
          batchUpdates={batchUpdates}
          syncPayload={{ authToken: 'insecure-token-change-me' }}
        >
          <Outlet />
        </LiveStoreProvider>
      </ErrorBoundary>
    </RootDocument>
  )
}

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})

const getStoreId = () => {
  if (typeof window === 'undefined') return 'unused'

  const searchParams = new URLSearchParams(window.location.search)
  const storeId = searchParams.get('storeId')
  if (storeId !== null) return storeId

  const newAppId = crypto.randomUUID()
  searchParams.set('storeId', newAppId)

  window.location.search = searchParams.toString()
}
