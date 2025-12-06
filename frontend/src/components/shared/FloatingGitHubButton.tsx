import { Github } from "lucide-react";

export function FloatingGitHubButton() {
  return (
    <a
      href="https://github.com/fpgmaas/pyatlas"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5
                 bg-gray-900/95 border border-gray-700/60 backdrop-blur-md shadow-xl
                 text-gray-200 text-sm font-medium
                 hover:bg-gray-800/95 hover:scale-[1.02] transition-all duration-100
                 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="View on GitHub"
    >
      <Github className="h-4 w-4" />
      <span>GitHub</span>
    </a>
  );
}
