import { useStore } from '@livestore/react'

import { uiState$ } from '../livestore/queries'
import { events } from '../livestore/schema'

export default function Header() {
  const { store } = useStore()
  const { newBookmarkText } = store.useQuery(uiState$)

  const updatedNewBookmarkText = (text: string) =>
    store.commit(events.uiStateSet({ newBookmarkText: text }))

  const bookmarkCreated = () =>
    store.commit(
      events.bookmarkCreated({
        id: crypto.randomUUID(),
        name: newBookmarkText,
        folderId: crypto.randomUUID(),
      }),
    )

  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between">
      <h1>Bookmarks</h1>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        value={newBookmarkText}
        onChange={(e) => updatedNewBookmarkText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            bookmarkCreated()
            updatedNewBookmarkText('')
          }
        }}
      />
    </header>
  )
}
