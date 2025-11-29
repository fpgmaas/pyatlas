export function SearchBar() {
  return (
    <div className="bg-gray-800 rounded-lg px-4 py-2 shadow-lg">
      <input
        type="text"
        placeholder="Search packages..."
        className="bg-transparent text-white outline-none w-64"
      />
    </div>
  );
}
