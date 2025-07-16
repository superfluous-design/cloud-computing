import { createFileRoute } from "@tanstack/react-router";
import logo from "../logo.svg";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <header className="text-center">
        <img
          src={logo}
          className="w-40 h-40 mx-auto mb-8 animate-spin"
          alt="logo"
        />
        <p className="text-xl mb-6">
          Edit{" "}
          <code className="bg-gray-800 px-2 py-1 rounded">
            src/routes/index.tsx
          </code>{" "}
          and save to reload.
        </p>
        <div className="space-y-4">
          <a
            className="block text-blue-400 hover:text-blue-300 transition-colors underline"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <a
            className="block text-blue-400 hover:text-blue-300 transition-colors underline"
            href="https://tanstack.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn TanStack
          </a>
          <div className="mt-8 p-4 bg-green-800 rounded-lg">
            <p className="text-green-100">✅ TailwindCSS is working!</p>
          </div>
        </div>
      </header>
    </div>
  );
}
