import "./App.css";
import { AuthProvider } from "./lib/auth-context";
import { AuthWrapper } from "./components/auth/AuthWrapper";
import { Header } from "./components/Header";
import BookmarkComponent from "./components/bookmark";

function App() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <BookmarkComponent />
          </main>
        </div>
      </AuthWrapper>
    </AuthProvider>
  );
}

export default App;
