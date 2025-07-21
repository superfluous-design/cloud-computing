import { queryDb } from '@livestore/livestore'
import { useStore } from '@livestore/react'
import React from 'react'

// import { uiState$ } from '../livestore/queries'
import { events, tables } from '../livestore/schema'

const bookmarks$ = queryDb(tables.bookmarks.select(), { label: 'bookmarks' })

export const MainSection: React.FC = () => {
  const { store } = useStore()
  const bookmarks = store.useQuery(bookmarks$)

  const deleteBookmark = (id: string) => {
    store.commit(events.bookmarkDeleted({ id }))
  }

  return (
    <table className="min-w-full border border-gray-200">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-4 py-2 text-left">Folder ID</th>
          <th className="px-4 py-2 text-left">ID</th>
          <th className="px-4 py-2 text-left">Name</th>
          <th className="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {bookmarks.map((bookmark) => (
          <tr key={bookmark.id} className="border-b">
            <td className="px-4 py-2">{bookmark.folderId}</td>
            <td className="px-4 py-2">{bookmark.id}</td>
            <td className="px-4 py-2">{bookmark.name}</td>
            <td className="px-4 py-2">
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={() => deleteBookmark(bookmark.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
