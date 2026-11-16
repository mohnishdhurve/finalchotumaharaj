import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { MenuItem } from '../types.ts';

interface MenuItemModalProps {
  isOpen: boolean;
  editingItem: MenuItem | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    price: number;
    description: string;
    prep_time_mins: number;
    is_veg: boolean;
    is_available: boolean;
  }) => Promise<void>;
}

export function MenuItemModal({
  isOpen,
  editingItem,
  existingCategories,
  onClose,
  onSave,
}: MenuItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Quick Bites');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [prepTime, setPrepTime] = useState('12');
  const [description, setDescription] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingItem) {
      setName(editingItem.name);
      if (existingCategories.includes(editingItem.category)) {
        setCategory(editingItem.category);
        setCustomCategory('');
      } else {
        setCategory('__custom__');
        setCustomCategory(editingItem.category);
      }
      setPrice(String(editingItem.price));
      setPrepTime(String(editingItem.prep_time_mins || 12));
      setDescription(editingItem.description || '');
      setIsVeg(editingItem.is_veg);
      setIsAvailable(editingItem.is_available);
    } else {
      setName('');
      setCategory(existingCategories[0] || 'Quick Bites');
      setCustomCategory('');
      setPrice('');
      setPrepTime('12');
      setDescription('');
      setIsVeg(true);
      setIsAvailable(true);
    }
  }, [isOpen, editingItem, existingCategories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const resolvedCategory = category === '__custom__' ? customCategory.trim() : category.trim();
    const numericPrice = Number(price);

    if (!name.trim()) {
      setError('Please enter an item name.');
      return;
    }
    if (!resolvedCategory) {
      setError('Please select or enter a category.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        category: resolvedCategory,
        price: numericPrice,
        description: description.trim(),
        prep_time_mins: Math.max(1, Number(prepTime) || 12),
        is_veg: isVeg,
        is_available: isAvailable,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={editingItem ? 'Edit menu item' : 'Add new menu item'}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="menu-item-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Item Name
            </label>
            <input
              id="menu-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Paneer Tikka Sandwich"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="menu-item-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="menu-item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ New Category...</option>
              </select>
            </div>

            <div>
              <label htmlFor="menu-item-price" className="mb-1.5 block text-sm font-medium text-slate-700">
                Price (₹)
              </label>
              <input
                id="menu-item-price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120"
                className="font-mono-num h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {category === '__custom__' && (
            <div>
              <label htmlFor="menu-custom-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                New Category Name
              </label>
              <input
                id="menu-custom-category"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g., Cold Beverages"
                className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="menu-item-prep" className="mb-1.5 block text-sm font-medium text-slate-700">
                Prep Time (mins)
              </label>
              <input
                id="menu-item-prep"
                type="number"
                min="1"
                max="60"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="font-mono-num h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-end gap-4 pb-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                Pure Veg
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                In Stock
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="menu-item-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
              Combo / Item Details (Optional)
            </label>
            <input
              id="menu-item-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Cold Drink + Salted Popcorn + Samosa (2 pcs)"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
