import { TopBar } from "./TopBar";
import { PackageDetail } from "../PackageDetail";
import { FloatingGitHubButton } from "../shared/FloatingGitHubButton";

export function MobileLayout() {
  return (
    <>
      <TopBar />

      {/* Package Detail - centered/full-width on small screens, positioned left on medium */}
      <div className="fixed bottom-3 z-40 pointer-events-auto left-3 right-3 sm:right-auto flex justify-center sm:justify-start">
        <PackageDetail />
      </div>

      {/* Floating GitHub button - only visible on medium screens (sm: and up) */}
      <div className="hidden sm:block">
        <FloatingGitHubButton />
      </div>
    </>
  );
}
