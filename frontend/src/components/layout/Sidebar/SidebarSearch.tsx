import { SearchBar } from "../../SearchBar";

export function SidebarSearch() {
  return (
    <div className="px-6 py-4 border-b border-gray-700/30">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Search Packages
      </label>
      <div className="rounded-lg border border-gray-700/50 bg-gray-800/50">
        <SearchBar />
      </div>
    </div>
  );
}
