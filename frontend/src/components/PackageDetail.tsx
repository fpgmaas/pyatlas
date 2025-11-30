import { useGalaxyStore } from '../store/useGalaxyStore';
import { X, ExternalLink } from 'lucide-react';
import { formatDownloads } from '../utils/formatDownloads';

export function PackageDetail() {
  const { selectedPackageId, packages, clusters, setSelectedPackageId } = useGalaxyStore();

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const cluster = selectedPackage ? clusters.find(c => c.clusterId === selectedPackage.clusterId) : null;

  if (!selectedPackage) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full max-w-md sm:w-96 border border-gray-700/50">
        <p className="text-gray-400 text-sm">Click on a package to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full max-w-md sm:w-96 border border-gray-700/50 relative">
      {/* Close button - absolute top-right */}
      <button
        onClick={() => setSelectedPackageId(null)}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800/50"
        aria-label="Close package details"
      >
        <X size={18} />
      </button>

      {/* Package name */}
      <h2 className="text-white text-xl font-bold mb-3 break-words pr-8">
        {selectedPackage.name}
      </h2>

      {/* PyPI link */}
      <a
        href={`https://pypi.org/project/${selectedPackage.name}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 text-sm mb-4"
      >
        View on PyPI <ExternalLink size={14} />
      </a>

      {/* Cluster section */}
      {cluster && (
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase tracking-wide mb-1 block">
            Cluster
          </label>
          <p className="text-white text-sm">
            {cluster.label}
          </p>
        </div>
      )}

      {/* Downloads section */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs uppercase tracking-wide mb-1 block">
          Downloads per week
        </label>
        <p className="text-white text-lg font-semibold">
          {formatDownloads(selectedPackage.downloads)}
        </p>
      </div>

      {/* Summary section */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide mb-2 block">
          Description
        </label>
        <p className="text-gray-300 text-sm leading-relaxed">
          {selectedPackage.summary || 'No description available'}
        </p>
      </div>
    </div>
  );
}
