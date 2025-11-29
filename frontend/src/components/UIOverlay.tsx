import { SearchBar } from './SearchBar';
import { ClusterLegend } from './ClusterLegend';
import { PackageDetail } from './PackageDetail';

export function UIOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute top-4 left-4 pointer-events-auto">
        <h1 className="text-2xl font-bold text-white">PyPI Galaxy</h1>
        <p className="text-sm text-gray-300">Explore Python packages</p>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <SearchBar />
      </div>

      <div className="absolute top-4 right-4 pointer-events-auto">
        <ClusterLegend />
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <PackageDetail />
      </div>
    </div>
  );
}
