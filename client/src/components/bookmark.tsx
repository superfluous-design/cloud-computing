"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Folder,
  Search,
  Trash2,
  ChevronDown,
  Globe,
  Link,
  Palette,
  Type,
  Loader2,
  User,
  Settings,
  LogOut,
  Download,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/use-auth";
import { LoginPage } from "@/components/auth/LoginPage";
import { RegisterPage } from "@/components/auth/RegisterPage";
import {
  apiClient,
  type BookmarkItem as ApiBookmarkItem,
  type FolderItem as ApiFolderItem,
} from "@/lib/api";

interface BookmarkItem {
  id: string;
  content: string;
  type: "url" | "text" | "color";
  title?: string;
  url?: string;
  folderId: string;
  createdAt: Date;
  folderName?: string;
}

interface FolderItem {
  id: string;
  name: string;
  createdAt: Date;
  bookmarkCount?: number;
}

export default function BookmarkManager() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [selectedBookmarkIndex, setSelectedBookmarkIndex] = useState(0);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [newItemContent, setNewItemContent] = useState("");
  const [isDetectingContent, setIsDetectingContent] = useState(false);
  const [contentPreview, setContentPreview] = useState<{
    type: string;
    icon: LucideIcon;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const bookmarkRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        // Check for localStorage migration first
        const localData = apiClient.migrateLocalStorageData();
        if (localData) {
          console.log("Migrating localStorage data to API...");
          const importResult = await apiClient.importData({
            ...localData,
            replaceExisting: false,
          });

          if (importResult.error) {
            console.error("Migration failed:", importResult.error);
          } else {
            console.log("Migration successful:", importResult.data?.stats);
            apiClient.clearLocalStorageData();
          }
        }

        // Load folders
        const foldersResult = await apiClient.getFolders();
        if (foldersResult.error) {
          console.error("Error loading folders:", foldersResult.error);
          // Initialize default folder if none exist
          await apiClient.initDefaultFolder();
          const retryFolders = await apiClient.getFolders();
          if (retryFolders.data) {
            const folders = retryFolders.data.map((folder: ApiFolderItem) => ({
              id: folder.folder_id,
              name: folder.name,
              createdAt: new Date(folder.created_at),
              bookmarkCount: folder.bookmark_count || 0,
            }));
            setFolders(folders);
            if (folders.length > 0) {
              setSelectedFolderId(folders[0].id);
            }
          }
        } else {
          const folders = foldersResult.data!.map((folder: ApiFolderItem) => ({
            id: folder.folder_id,
            name: folder.name,
            createdAt: new Date(folder.created_at),
            bookmarkCount: folder.bookmark_count || 0,
          }));
          setFolders(folders);
          if (folders.length > 0) {
            setSelectedFolderId(folders[0].id);
          }
        }

        // Load bookmarks
        const bookmarksResult = await apiClient.getBookmarks();
        if (bookmarksResult.error) {
          console.error("Error loading bookmarks:", bookmarksResult.error);
        } else {
          const bookmarks = bookmarksResult.data!.map(
            (bookmark: ApiBookmarkItem) => ({
              id: bookmark.bookmark_id,
              content: bookmark.content,
              type: bookmark.type,
              title: bookmark.title,
              url: bookmark.url,
              folderId: bookmark.folder_id,
              createdAt: new Date(bookmark.created_at),
              folderName: bookmark.folder_name,
            })
          );
          setBookmarks(bookmarks);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
        // Focus input after loading
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // No longer using localStorage - data is persisted via API

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesFolder =
      selectedFolderId === "" || bookmark.folderId === selectedFolderId;
    const matchesSearch =
      debouncedSearchQuery === "" ||
      bookmark.content
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase()) ||
      bookmark.title
        ?.toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase()) ||
      bookmark.url?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  // Reset selection when filtered bookmarks change
  useEffect(() => {
    if (selectedBookmarkIndex >= filteredBookmarks.length) {
      setSelectedBookmarkIndex(Math.max(0, filteredBookmarks.length - 1));
    }
  }, [filteredBookmarks.length, selectedBookmarkIndex]);

  // Scroll selected bookmark into view
  useEffect(() => {
    if (bookmarkRefs.current[selectedBookmarkIndex]) {
      bookmarkRefs.current[selectedBookmarkIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedBookmarkIndex]);

  const detectContentType = (
    content: string
  ): { type: "url" | "text" | "color"; title?: string; url?: string } => {
    const trimmed = content.trim();
    if (!trimmed) return { type: "text" };

    // Enhanced color detection
    const colorPatterns = [
      /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
      /^rgb$$\s*\d+\s*,\s*\d+\s*,\s*\d+\s*$$$/,
      /^rgba$$\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*$$$/,
      /^hsl$$\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*$$$/,
      /^hsla$$\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*$$$/,
    ];

    if (colorPatterns.some((pattern) => pattern.test(trimmed))) {
      return { type: "color" };
    }

    // Enhanced URL detection
    const urlPatterns = [
      /^https?:\/\/.+/,
      /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/.*)?$/,
      /^www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/.*)?$/,
      /^[a-zA-Z0-9-]+\.(com|org|net|edu|gov|io|co|dev|app|tech|ai|me|ly|to|cc|tv|fm|am|it|de|fr|uk|ca|au|jp|cn|in|br|mx|ru|nl|se|no|dk|fi|pl|cz|hu|ro|bg|hr|si|sk|ee|lv|lt|is|ie|pt|es|gr|tr|il|ae|sa|eg|za|ng|ke|gh|tz|ug|zw|bw|mw|zm|ao|mz|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ly|tn|dz|ma|eh|sn|gm|gw|gn|sl|lr|ci|bf|ml|ne|td|cf|cm|gq|ga|cg|cd|ao|na|bw|sz|ls|za|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|eh)$/,
    ];

    if (urlPatterns.some((pattern) => pattern.test(trimmed))) {
      try {
        const url = new URL(
          trimmed.includes("://") ? trimmed : `https://${trimmed}`
        );
        if (url.protocol === "http:" || url.protocol === "https:") {
          return {
            type: "url",
            url: url.href,
            title: url.hostname.replace("www.", ""),
          };
        }
      } catch {
        // Fallback for edge cases
        if (trimmed.includes(".") && !trimmed.includes(" ")) {
          return {
            type: "url",
            url: `https://${trimmed}`,
            title: trimmed.replace("www.", ""),
          };
        }
      }
    }

    return { type: "text" };
  };

  // Content preview as user types
  useEffect(() => {
    if (!newItemContent.trim()) {
      setContentPreview(null);
      return;
    }

    setIsDetectingContent(true);
    const timer = setTimeout(() => {
      const { type } = detectContentType(newItemContent);
      const icons = {
        url: Link,
        color: Palette,
        text: Type,
      };
      setContentPreview({ type, icon: icons[type] });
      setIsDetectingContent(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [newItemContent]);

  const addFolder = async (name: string) => {
    try {
      const result = await apiClient.createFolder(name);
      if (result.error) {
        console.error("Error creating folder:", result.error);
        return;
      }

      const newFolder: FolderItem = {
        id: result.data!.folder_id,
        name: result.data!.name,
        createdAt: new Date(result.data!.created_at),
        bookmarkCount: 0,
      };

      setFolders((prev) => [...prev, newFolder]);
      setIsAddFolderOpen(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const addBookmark = async (content: string) => {
    if (!content.trim()) return;

    try {
      const { type, title, url } = detectContentType(content);

      const result = await apiClient.createBookmark({
        content: content.trim(),
        type,
        title,
        url,
        folder_id: selectedFolderId,
      });

      if (result.error) {
        console.error("Error creating bookmark:", result.error);
        return;
      }

      const newBookmark: BookmarkItem = {
        id: result.data!.bookmark_id,
        content: result.data!.content,
        type: result.data!.type,
        title: result.data!.title,
        url: result.data!.url,
        folderId: result.data!.folder_id,
        createdAt: new Date(result.data!.created_at),
      };

      setBookmarks((prev) => [newBookmark, ...prev]);
      setNewItemContent("");
      setSelectedBookmarkIndex(0);

      // Update folder bookmark count
      setFolders((prev) =>
        prev.map((f) =>
          f.id === selectedFolderId
            ? { ...f, bookmarkCount: (f.bookmarkCount || 0) + 1 }
            : f
        )
      );

      // Focus back to input
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error("Error creating bookmark:", error);
    }
  };

  const deleteBookmark = useCallback(
    async (id: string) => {
      try {
        const bookmarkToDelete = bookmarks.find((b) => b.id === id);

        const result = await apiClient.deleteBookmark(id);
        if (result.error) {
          console.error("Error deleting bookmark:", result.error);
          return;
        }

        setBookmarks((prev) => prev.filter((b) => b.id !== id));

        if (selectedBookmarkIndex >= filteredBookmarks.length - 1) {
          setSelectedBookmarkIndex(Math.max(0, filteredBookmarks.length - 2));
        }

        // Update folder bookmark count
        if (bookmarkToDelete) {
          setFolders((prev) =>
            prev.map((f) =>
              f.id === bookmarkToDelete.folderId
                ? {
                    ...f,
                    bookmarkCount: Math.max(0, (f.bookmarkCount || 1) - 1),
                  }
                : f
            )
          );
        }
      } catch (error) {
        console.error("Error deleting bookmark:", error);
      }
    },
    [bookmarks, selectedBookmarkIndex, filteredBookmarks]
  );

  const deleteFolder = async (id: string) => {
    if (id.startsWith("default-")) return;

    try {
      const result = await apiClient.deleteFolder(id);
      if (result.error) {
        console.error("Error deleting folder:", result.error);
        return;
      }

      setFolders((prev) => prev.filter((f) => f.id !== id));

      // Bookmarks are moved to default folder by the API
      // Reload bookmarks to get updated folder assignments
      const bookmarksResult = await apiClient.getBookmarks();
      if (bookmarksResult.data) {
        const updatedBookmarks = bookmarksResult.data.map(
          (bookmark: ApiBookmarkItem) => ({
            id: bookmark.bookmark_id,
            content: bookmark.content,
            type: bookmark.type,
            title: bookmark.title,
            url: bookmark.url,
            folderId: bookmark.folder_id,
            createdAt: new Date(bookmark.created_at),
            folderName: bookmark.folder_name,
          })
        );
        setBookmarks(updatedBookmarks);
      }

      if (selectedFolderId === id) {
        const remainingFolders = folders.filter((f) => f.id !== id);
        setSelectedFolderId(remainingFolders[0]?.id || "");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const selectFolderByNumber = useCallback(
    (number: number) => {
      const folderIndex = number - 1;
      if (folderIndex >= 0 && folderIndex < folders.length) {
        setSelectedFolderId(folders[folderIndex].id);
        setSelectedBookmarkIndex(0);
        setIsFolderDropdownOpen(false);
      }
    },
    [folders]
  );

  const exportBookmarks = async () => {
    try {
      const result = await apiClient.exportData();
      if (result.error) {
        console.error("Error exporting data:", result.error);
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookmarks-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting bookmarks:", error);
    }
  };

  const importBookmarks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        if (data.folders && data.bookmarks) {
          const result = await apiClient.importData({
            folders: data.folders,
            bookmarks: data.bookmarks,
            replaceExisting: confirm(
              "Replace all existing bookmarks? Click Cancel to merge with existing data."
            ),
          });

          if (result.error) {
            console.error("Import failed:", result.error);
            alert("Import failed: " + result.error);
            return;
          }

          console.log("Import successful:", result.data?.stats);

          // Reload data after import
          const [foldersResult, bookmarksResult] = await Promise.all([
            apiClient.getFolders(),
            apiClient.getBookmarks(),
          ]);

          if (foldersResult.data) {
            const folders = foldersResult.data.map((folder: ApiFolderItem) => ({
              id: folder.folder_id,
              name: folder.name,
              createdAt: new Date(folder.created_at),
              bookmarkCount: folder.bookmark_count || 0,
            }));
            setFolders(folders);
            if (folders.length > 0) {
              setSelectedFolderId(folders[0].id);
            }
          }

          if (bookmarksResult.data) {
            const bookmarks = bookmarksResult.data.map(
              (bookmark: ApiBookmarkItem) => ({
                id: bookmark.bookmark_id,
                content: bookmark.content,
                type: bookmark.type,
                title: bookmark.title,
                url: bookmark.url,
                folderId: bookmark.folder_id,
                createdAt: new Date(bookmark.created_at),
                folderName: bookmark.folder_name,
              })
            );
            setBookmarks(bookmarks);
          }

          alert(
            `Import completed!\nFolders: ${result.data?.stats.foldersImported} imported, ${result.data?.stats.foldersSkipped} skipped\nBookmarks: ${result.data?.stats.bookmarksImported} imported, ${result.data?.stats.bookmarksSkipped} skipped`
          );
        } else {
          alert(
            "Invalid file format. Please select a valid bookmark export file."
          );
        }
      } catch (error) {
        console.error("Failed to import bookmarks:", error);
        alert(
          "Failed to import bookmarks: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w ago`;

    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Enhanced keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault();
            if (e.shiftKey) {
              setIsAddFolderOpen(true);
            } else {
              inputRef.current?.focus();
            }
            break;
          case "f":
          case "k":
            e.preventDefault();
            searchRef.current?.focus();
            break;
          case "d":
            e.preventDefault();
            setIsFolderDropdownOpen((prev) => !prev);
            break;
          case "/":
            e.preventDefault();
            searchRef.current?.focus();
            break;
        }
        return;
      }

      // Number keys for folder selection
      if (
        e.key >= "1" &&
        e.key <= "9" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        selectFolderByNumber(Number.parseInt(e.key));
        return;
      }

      // Navigation shortcuts (when not in input)
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        switch (e.key) {
          case "j":
          case "ArrowDown":
            e.preventDefault();
            setSelectedBookmarkIndex((prev) =>
              Math.min(filteredBookmarks.length - 1, prev + 1)
            );
            break;
          case "k":
          case "ArrowUp":
            e.preventDefault();
            setSelectedBookmarkIndex((prev) => Math.max(0, prev - 1));
            break;
          case "Enter": {
            e.preventDefault();
            const bookmark = filteredBookmarks[selectedBookmarkIndex];
            if (bookmark?.type === "url" && bookmark.url) {
              window.open(bookmark.url, "_blank");
            }
            break;
          }
          case "Delete":
          case "Backspace": {
            e.preventDefault();
            const bookmarkToDelete = filteredBookmarks[selectedBookmarkIndex];
            if (bookmarkToDelete) {
              deleteBookmark(bookmarkToDelete.id);
            }
            break;
          }
          case "Escape":
            e.preventDefault();

            // Always blur the currently focused element first if it's an input
            if (
              document.activeElement &&
              (document.activeElement.tagName === "INPUT" ||
                document.activeElement.tagName === "TEXTAREA")
            ) {
              (document.activeElement as HTMLElement).blur();
              return; // Exit early after blurring input
            }

            // Handle other escape behaviors only when not focused on inputs
            if (
              document.activeElement &&
              document.activeElement !== document.body
            ) {
              (document.activeElement as HTMLElement).blur();
            } else if (searchQuery) {
              setSearchQuery("");
            } else if (newItemContent) {
              setNewItemContent("");
            } else {
              setSelectedBookmarkIndex(0);
              setIsFolderDropdownOpen(false);
            }
            break;
          case " ":
            e.preventDefault();
            setIsFolderDropdownOpen((prev) => !prev);
            break;
          case "i":
            e.preventDefault();
            inputRef.current?.focus();
            break;
        }
      }
    },
    [
      selectedBookmarkIndex,
      filteredBookmarks,
      searchQuery,
      newItemContent,
      deleteBookmark,
      selectFolderByNumber,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth pages if not authenticated
  if (!isAuthenticated) {
    return isLoginMode ? (
      <LoginPage onSwitchToRegister={() => setIsLoginMode(false)} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setIsLoginMode(true)} />
    );
  }

  // App loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading bookmarks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* App Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-zinc-100">Superfluous</h1>
            {user && (
              <span className="text-sm text-zinc-400">
                Welcome, {user.email}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu
              open={isFolderDropdownOpen}
              onOpenChange={setIsFolderDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                  aria-label={`Current folder: ${currentFolder?.name}. Click to change folder.`}
                >
                  <Folder className="h-4 w-4" />
                  <span className="max-w-32 sm:max-w-none truncate">
                    {currentFolder?.name || "Select Folder"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-zinc-800 text-zinc-300"
                  >
                    {currentFolder?.bookmarkCount ??
                      bookmarks.filter((b) => b.folderId === selectedFolderId)
                        .length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 bg-zinc-900 border-zinc-800"
              >
                {folders.map((folder, index) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setSelectedBookmarkIndex(0);
                    }}
                    className="flex items-center justify-between text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="w-6 h-6 p-0 flex items-center justify-center text-xs border-zinc-700 text-white"
                      >
                        {index + 1}
                      </Badge>
                      <Folder className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-zinc-800 text-zinc-300"
                      >
                        {folder.bookmarkCount ??
                          bookmarks.filter((b) => b.folderId === folder.id)
                            .length}
                      </Badge>
                      {!folder.id.startsWith("default-") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300 transition-colors"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => setIsAddFolderOpen(true)}
                  className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                ref={searchRef}
                id="search-input"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
                aria-label="Search bookmarks"
              />
            </div>

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src="/placeholder.svg?height=32&width=32"
                      alt="User"
                    />
                    <AvatarFallback className="bg-zinc-800 text-zinc-100">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-zinc-900 border-zinc-800"
              >
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-zinc-100">
                      {user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="w-[200px] truncate text-sm text-zinc-400">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={exportBookmarks}
                  className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Bookmarks</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
                  <Upload className="mr-2 h-4 w-4" />
                  <label htmlFor="import-bookmarks" className="cursor-pointer">
                    Import Bookmarks
                  </label>
                  <input
                    id="import-bookmarks"
                    type="file"
                    accept=".json"
                    onChange={importBookmarks}
                    className="hidden"
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Add Item Input */}
        <div className="mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addBookmark(newItemContent);
            }}
            className="relative"
          >
            <Plus className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              ref={inputRef}
              id="new-item-input"
              placeholder="Insert a link, color, or just plain text..."
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              className="pl-12 pr-20 py-4 text-lg bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:border-zinc-600 transition-colors"
              aria-label="Add new bookmark"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {isDetectingContent ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              ) : contentPreview ? (
                <div className="flex items-center gap-1 text-zinc-500">
                  <contentPreview.icon className="h-4 w-4" />
                  <span className="text-xs capitalize">
                    {contentPreview.type}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-zinc-500 text-sm">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">
                    ⌘
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">
                    N
                  </kbd>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Bookmarks Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr,auto] gap-4 px-4 py-2 text-sm text-zinc-500 border-b border-zinc-800">
            <div>Title</div>
            <div className="hidden sm:block">Created at</div>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <div className="mb-4">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No bookmarks match "{searchQuery}"</p>
                  </>
                ) : (
                  <>
                    <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No bookmarks yet</p>
                    <p className="text-sm mt-1">
                      Add your first bookmark above
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            filteredBookmarks.map((bookmark, index) => (
              <div
                key={bookmark.id}
                ref={(el) => {
                  bookmarkRefs.current[index] = el;
                }}
                className={`grid grid-cols-[1fr,auto] gap-4 px-4 py-3 rounded-lg transition-all duration-150 cursor-pointer group ${
                  selectedBookmarkIndex === index
                    ? "bg-zinc-800 ring-1 ring-zinc-700"
                    : "hover:bg-zinc-900"
                }`}
                onClick={() => {
                  if (bookmark.type === "url" && bookmark.url) {
                    window.open(bookmark.url, "_blank", "noopener,noreferrer");
                  }
                }}
                role="button"
                tabIndex={-1}
                aria-label={`${bookmark.type === "url" ? "Open" : "View"} ${
                  bookmark.title || bookmark.content
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {bookmark.type === "url" ? (
                    <>
                      <div className="w-4 h-4 flex-shrink-0 bg-zinc-800 rounded flex items-center justify-center">
                        <Globe className="w-3 h-3 text-zinc-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-zinc-100 truncate font-medium">
                          {bookmark.title || bookmark.content}
                        </div>
                        <div className="text-zinc-500 text-sm truncate">
                          {bookmark.url}
                        </div>
                      </div>
                    </>
                  ) : bookmark.type === "color" ? (
                    <>
                      <div
                        className="w-4 h-4 flex-shrink-0 rounded border border-zinc-700 shadow-sm"
                        style={{ backgroundColor: bookmark.content }}
                        aria-label={`Color: ${bookmark.content}`}
                      />
                      <div className="text-zinc-100 font-mono">
                        {bookmark.content}
                      </div>
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4 flex-shrink-0 text-zinc-600" />
                      <div className="text-zinc-100">{bookmark.content}</div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-zinc-500 text-sm whitespace-nowrap hidden sm:block">
                    {formatDate(bookmark.createdAt)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/20"
                    aria-label={`Delete ${bookmark.title || bookmark.content}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Enhanced Keyboard shortcuts help */}
        <div className="mt-8 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="font-medium text-zinc-400 mb-2">Navigation</div>
                <div className="flex flex-wrap gap-3">
                  <span>
                    <kbd className="kbd">1-9</kbd> Select folder
                  </span>
                  <span>
                    <kbd className="kbd">j/k</kbd> or{" "}
                    <kbd className="kbd">↑↓</kbd> Navigate
                  </span>
                  <span>
                    <kbd className="kbd">Enter</kbd> Open
                  </span>
                  <span>
                    <kbd className="kbd">Del</kbd> Delete
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-zinc-400 mb-2">Actions</div>
                <div className="flex flex-wrap gap-3">
                  <span>
                    <kbd className="kbd">⌘N</kbd> New item
                  </span>
                  <span>
                    <kbd className="kbd">⌘⇧N</kbd> New folder
                  </span>
                  <span>
                    <kbd className="kbd">⌘F</kbd> Search
                  </span>
                  <span>
                    <kbd className="kbd">i</kbd> Focus input
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Folder Dialog */}
        <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Add New Folder</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                if (name.trim()) {
                  addFolder(name.trim());
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name" className="text-zinc-300 pb-4">
                    Folder Name
                  </Label>
                  <Input
                    id="folder-name"
                    name="name"
                    placeholder="Enter folder name"
                    required
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-zinc-600 transition-colors"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Folder
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <style>{`
        .kbd {
          @apply px-1.5 py-0.5 bg-zinc-800 rounded text-xs font-mono;
        }
      `}</style>
    </div>
  );
}
