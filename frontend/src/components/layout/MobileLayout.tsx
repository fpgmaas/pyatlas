import { TopBar } from "./TopBar";
import { PackageDetail } from "../PackageDetail";
import { FloatingGitHubButton } from "../shared/FloatingGitHubButton";
import { ZoomControls } from "../shared/ZoomControls";

export function MobileLayout() {
  return (
    <>
      <TopBar />

      {/* Bottom layout container */}
      <div className="fixed bottom-3 left-3 right-3 sm:right-auto z-40 pointer-events-none">
        {/* Mobile: stack vertically, sm+: side by side */}
        <div className="flex flex-col sm:flex-row items-end sm:items-end gap-2 pointer-events-auto">
          {/* Zoom controls - above on mobile, beside on sm+ */}
          <div className="self-end sm:order-2 sm:hidden">
            <ZoomControls />
          </div>
          <PackageDetail />
        </div>
      </div>

      {/* sm+ controls - positioned at bottom right */}
      <div className="hidden sm:flex fixed bottom-4 right-3 z-40 items-end gap-2">
        <FloatingGitHubButton />
        <ZoomControls />
      </div>
    </>
  );
}
