import { AuthProvider } from "./lib/auth-context";
import BookmarkComponent from "./components/bookmark";

function App() {
  return (
    <AuthProvider>
      <BookmarkComponent />
    </AuthProvider>
  );
}

export default App;
