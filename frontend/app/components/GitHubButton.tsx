import React from "react";

const GitHubButton: React.FC = () => {
  return (
    <a
      href="https://github.com/fpgmaas/pylens"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center p-2 border border-sky-700 rounded bg-sky-900 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700"
    >
      <svg
        height="24"
        width="24"
        viewBox="0 0 16 16"
        fill="white"
        className="mr-2"
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.45.55.38A8.001 8.001 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
      GitHub
    </a>
  );
};

export default GitHubButton;
