// API client for bookmark services
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface BookmarkItem {
  bookmark_id: string;
  content: string;
  type: "url" | "text" | "color";
  title?: string;
  url?: string;
  folder_id: string;
  created_at: string;
  folder_name?: string;
}

interface FolderItem {
  folder_id: string;
  name: string;
  created_at: string;
  bookmark_count?: number;
}

interface ExportData {
  folders: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  bookmarks: Array<{
    id: string;
    content: string;
    type: string;
    title?: string;
    url?: string;
    folderId: string;
    createdAt: string;
  }>;
  exportedAt: string;
  exportedBy: string;
}

interface ImportStats {
  foldersImported: number;
  bookmarksImported: number;
  foldersSkipped: number;
  bookmarksSkipped: number;
  errors: string[];
}

class ApiClient {
  private baseUrls = {
    bookmarks: "http://localhost:3003",
    folders: "http://localhost:3004",
    export: "http://localhost:3005",
  };

  private getAuthToken(): string | null {
    const tokens = localStorage.getItem("auth_tokens");
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      return parsedTokens.access_token;
    }
    return null;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.getAuthToken();

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid tokens and redirect to login
          localStorage.removeItem("auth_tokens");
          window.location.reload();
          return { error: "Authentication required" };
        }

        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Bookmark operations (express2)
  async getBookmarks(): Promise<ApiResponse<BookmarkItem[]>> {
    return this.makeRequest(`${this.baseUrls.bookmarks}/bookmarks`);
  }

  async createBookmark(bookmark: {
    content: string;
    type: "url" | "text" | "color";
    title?: string;
    url?: string;
    folder_id: string;
  }): Promise<ApiResponse<BookmarkItem>> {
    return this.makeRequest(`${this.baseUrls.bookmarks}/bookmarks`, {
      method: "POST",
      body: JSON.stringify(bookmark),
    });
  }

  async updateBookmark(
    id: string,
    updates: Partial<{
      content: string;
      type: "url" | "text" | "color";
      title?: string;
      url?: string;
      folder_id: string;
    }>
  ): Promise<ApiResponse<BookmarkItem>> {
    return this.makeRequest(`${this.baseUrls.bookmarks}/bookmarks/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteBookmark(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`${this.baseUrls.bookmarks}/bookmarks/${id}`, {
      method: "DELETE",
    });
  }

  // Folder operations (express3)
  async getFolders(): Promise<ApiResponse<FolderItem[]>> {
    return this.makeRequest(`${this.baseUrls.folders}/folders`);
  }

  async createFolder(name: string): Promise<ApiResponse<FolderItem>> {
    return this.makeRequest(`${this.baseUrls.folders}/folders`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updateFolder(
    id: string,
    name: string
  ): Promise<ApiResponse<FolderItem>> {
    return this.makeRequest(`${this.baseUrls.folders}/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(
    id: string
  ): Promise<ApiResponse<{ message: string; moved_bookmarks: boolean }>> {
    return this.makeRequest(`${this.baseUrls.folders}/folders/${id}`, {
      method: "DELETE",
    });
  }

  async initDefaultFolder(): Promise<ApiResponse<FolderItem>> {
    return this.makeRequest(`${this.baseUrls.folders}/folders/init-default`, {
      method: "POST",
    });
  }

  // Export/Import operations (express4)
  async exportData(): Promise<ApiResponse<ExportData>> {
    return this.makeRequest(`${this.baseUrls.export}/export`);
  }

  async importData(data: {
    folders: FolderItem[];
    bookmarks: BookmarkItem[];
    replaceExisting?: boolean;
  }): Promise<ApiResponse<{ message: string; stats: ImportStats }>> {
    return this.makeRequest(`${this.baseUrls.export}/import`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkDelete(options: {
    bookmarkIds?: string[];
    folderIds?: string[];
  }): Promise<
    ApiResponse<{
      message: string;
      deletedBookmarks: number;
      deletedFolders: number;
    }>
  > {
    return this.makeRequest(`${this.baseUrls.export}/bulk-delete`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  // Migration helper: convert localStorage data to API format
  migrateLocalStorageData(): {
    folders: FolderItem[];
    bookmarks: BookmarkItem[];
  } | null {
    try {
      const savedFolders = localStorage.getItem("bookmark-folders");
      const savedBookmarks = localStorage.getItem("bookmark-items");

      if (!savedFolders || !savedBookmarks) {
        return null;
      }

      const folders = JSON.parse(savedFolders);
      const bookmarks = JSON.parse(savedBookmarks);

      return {
        folders: folders.map(
          (folder: { id: string; name: string; createdAt: string }) => ({
            id: folder.id,
            name: folder.name,
            createdAt: folder.createdAt,
          })
        ),
        bookmarks: bookmarks.map(
          (bookmark: {
            id: string;
            content: string;
            type: string;
            title?: string;
            url?: string;
            folderId: string;
            createdAt: string;
          }) => ({
            id: bookmark.id,
            content: bookmark.content,
            type: bookmark.type,
            title: bookmark.title,
            url: bookmark.url,
            folderId: bookmark.folderId,
            createdAt: bookmark.createdAt,
          })
        ),
      };
    } catch (error) {
      console.error("Error migrating localStorage data:", error);
      return null;
    }
  }

  // Clear localStorage after successful migration
  clearLocalStorageData(): void {
    localStorage.removeItem("bookmark-folders");
    localStorage.removeItem("bookmark-items");
  }
}

export const apiClient = new ApiClient();
export type { BookmarkItem, FolderItem, ExportData, ImportStats, ApiResponse };
