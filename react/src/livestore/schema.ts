import * as Livestore from '@livestore/livestore'

// You can model your state as SQLite tables (https://docs.livestore.dev/reference/state/sqlite-schema)
export const tables = {
  folders: Livestore.State.SQLite.table({
    name: 'folders',
    columns: {
      id: Livestore.State.SQLite.text({ primaryKey: true }),
      name: Livestore.State.SQLite.text({ default: '' }),
    },
  }),
  bookmarks: Livestore.State.SQLite.table({
    name: 'bookmarks',
    columns: {
      id: Livestore.State.SQLite.text({ primaryKey: true }),
      folderId: Livestore.State.SQLite.text({ default: '' }),
      name: Livestore.State.SQLite.text({ default: '' }),
    },
  }),
  // Client documents can be used for local-only state (e.g. form inputs)
  uiState: Livestore.State.SQLite.clientDocument({
    name: 'uiState',
    schema: Livestore.Schema.Struct({
      newBookmarkText: Livestore.Schema.String,
      folder: Livestore.Schema.String,
    }),
    default: {
      id: Livestore.SessionIdSymbol,
      value: { newBookmarkText: '', folder: '' },
    },
  }),
}

// Events describe data changes (https://docs.livestore.dev/reference/events)
export const events = {
  bookmarkCreated: Livestore.Events.synced({
    name: 'v1.BookmarkCreated',
    schema: Livestore.Schema.Struct({
      folderId: Livestore.Schema.String,
      id: Livestore.Schema.String,
      name: Livestore.Schema.String,
    }),
  }),
  bookmarkUpdated: Livestore.Events.synced({
    name: 'v1.BookmarkUpdated',
    schema: Livestore.Schema.Struct({
      folderId: Livestore.Schema.String,
      id: Livestore.Schema.String,
      name: Livestore.Schema.String,
    }),
  }),
  bookmarkDeleted: Livestore.Events.synced({
    name: 'v1.BookmarkDeleted',
    schema: Livestore.Schema.Struct({ id: Livestore.Schema.String }),
  }),
  uiStateSet: tables.uiState.set,
}

// Materializers are used to map events to state (https://docs.livestore.dev/reference/state/materializers)
const materializers = Livestore.State.SQLite.materializers(events, {
  'v1.BookmarkCreated': ({ id, name, folderId }) =>
    tables.bookmarks.insert({ id, name, folderId }),
  'v1.BookmarkUpdated': ({ id, name }) =>
    tables.bookmarks.update({ name }).where({ id }),
  'v1.BookmarkDeleted': ({ id }) => tables.bookmarks.delete().where({ id }),
})

const state = Livestore.State.SQLite.makeState({ tables, materializers })

export const schema = Livestore.makeSchema({ events, state })
