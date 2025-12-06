import { TopBar } from "./TopBar";
import { PackageDetail } from "../PackageDetail";
import { FloatingGitHubButton } from "../shared/FloatingGitHubButton";
import { ZoomControls } from "../shared/ZoomControls";

export function MobileLayout() {
  return (
    <>
      <TopBar />

      {/* Package Detail - centered/full-width on small screens, positioned left on medium */}
      <div className="fixed bottom-3 z-40 pointer-events-auto left-3 right-3 sm:right-auto flex justify-center sm:justify-start">
        <PackageDetail />
      </div>

      {/* Bottom right controls - zoom always visible, GitHub only on sm+ */}
      <div className="fixed bottom-4 right-3 z-40 flex items-end gap-2">
        <div className="hidden sm:block">
          <FloatingGitHubButton />
        </div>
        <ZoomControls />
      </div>
    </>
  );
}
