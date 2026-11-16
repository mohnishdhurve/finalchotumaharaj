import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { MenuItem } from '../types.ts';
import { formatINR } from '../utils/format.ts';

interface MenuManagerProps {
  menuItems: MenuItem[];
  onAddNew: () => void;
  onEditItem: (item: MenuItem) => void;
  onToggleAvailability: (item: MenuItem) => Promise<void>;
  onDeleteItem: (item: MenuItem) => Promise<void>;
}

export function MenuManager({
  menuItems,
  onAddNew,
  onEditItem,
  onToggleAvailability,
  onDeleteItem,
}: MenuManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((m) => m.category)));
    return ['All', ...unique];
  }, [menuItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((m) => {
      if (selectedCategory !== 'All' && m.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [menuItems, selectedCategory, search]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes or categories..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter menu by category"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="font-mono-num text-xs text-slate-500">
            {filtered.length} of {menuItems.length} items
          </span>
        </div>

        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Menu Item
        </button>
      </div>

      {/* Menu Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Dish Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Prep Time</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border ${
                          item.is_veg ? 'border-emerald-600' : 'border-red-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </span>
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                    {item.description && (
                      <div className="mt-0.5 pl-5.5 text-xs text-slate-500">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.category}</td>
                  <td className="font-mono-num px-4 py-3 text-xs text-slate-600">
                    {item.prep_time_mins} mins
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void onToggleAvailability(item)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        item.is_available
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {item.is_available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right font-semibold text-slate-900">
                    {formatINR(item.price)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>

                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteItem(item);
                              setConfirmDeleteId(null);
                            }}
                            className="h-8 rounded-md bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
