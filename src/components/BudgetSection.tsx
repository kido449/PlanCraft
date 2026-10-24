import React, { useState } from 'react';
import { BudgetItemRecord, BudgetItemStatus } from '../types';
import { withScrollLock } from '../utils/scrollStability';
import {
  Plus,
  Trash2,
  Check,
  Edit2,
  Lock,
  Search,
  ArrowUpDown,
  PieChart,
  Sparkles,
} from 'lucide-react';

interface BudgetSectionProps {
  items: BudgetItemRecord[];
  totalBudget: number;
  onUpdateItem: (id: string, updates: Partial<BudgetItemRecord>) => Promise<void>;
  onAddItem: (item: Omit<BudgetItemRecord, 'id' | 'event_id'>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onTriggerReplan: () => void;
}

export const BudgetSection: React.FC<BudgetSectionProps> = ({
  items,
  totalBudget,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onTriggerReplan,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editEstimatedCost, setEditEstimatedCost] = useState<number>(0);
  const [editActualCost, setEditActualCost] = useState<string>('');
  const [editStatus, setEditStatus] = useState<BudgetItemStatus>('planned');
  const [editNotes, setEditNotes] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Search & Sort filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'cost-desc' | 'cost-asc' | 'name'>('default');

  const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalActual = items.reduce((sum, item) => sum + (item.actual_cost || 0), 0);
  const variance = totalBudget - totalEstimated;

  const startEditing = (item: BudgetItemRecord) => {
    setEditingId(item.id);
    setEditCategory(item.category);
    setEditEstimatedCost(item.estimated_cost);
    setEditActualCost(item.actual_cost !== null ? String(item.actual_cost) : '');
    setEditStatus(item.status);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (id: string) => {
    await withScrollLock(async () => {
      await onUpdateItem(id, {
        category: editCategory,
        estimated_cost: Number(editEstimatedCost),
        actual_cost: editActualCost.trim() !== '' ? Number(editActualCost) : null,
        status: editStatus,
        notes: editNotes,
      });
      setEditingId(null);
    });
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !newEstimatedCost) return;

    await withScrollLock(async () => {
      await onAddItem({
        category: newCategory.trim(),
        estimated_cost: Number(newEstimatedCost),
        actual_cost: null,
        status: 'planned',
        notes: newNotes.trim(),
      });

      setNewCategory('');
      setNewEstimatedCost('');
      setNewNotes('');
      setShowAddForm(false);
    });
  };

  // Filter & sort logic
  const filteredItems = items
    .filter((item) => {
      const matchSearch =
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'cost-desc') return b.estimated_cost - a.estimated_cost;
      if (sortBy === 'cost-asc') return a.estimated_cost - b.estimated_cost;
      if (sortBy === 'name') return a.category.localeCompare(b.category);
      return 0;
    });

  // Category distribution calculation for the segmented visual bar
  const terracottaPalette = [
    '#9C5234',
    '#B36846',
    '#632917',
    '#C47E5A',
    '#D98E69',
    '#413936',
    '#75351E',
    '#A25737',
  ];

  return (
    <section className="bg-transparent border border-[#14372D]/20 rounded-[16px] p-6 sm:p-8 space-y-6">
      {/* Header with Lora accent */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#14372D]/15 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium block mb-1">
            01 // Financial Allocation
          </span>
          <h3 className="text-2xl sm:text-3xl font-medium tracking-[-1.5px] text-[#111111]">
            Budget <span className="accent-serif">discipline</span> & allocation
          </h3>
          <p className="text-sm text-[#7A7571] mt-1 font-normal">
            Every dollar mathematically balanced by GenAI against your ${totalBudget.toLocaleString()} constraint.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onTriggerReplan}
            className="h-[40px] px-4 rounded-full bg-white border border-[#14372D]/20 hover:border-[#111111] text-[#111111] text-xs font-medium transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Trigger constraint-aware AI replan with live mathematical rebalancing"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>✦ Live GenAI Replan</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-[40px] px-4 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] text-xs font-medium transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Allocation</span>
          </button>
        </div>
      </div>

      {/* 4 Flat Stat Numerals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
        <div className="border-l border-[#14372D]/20 pl-4">
          <span className="text-xs uppercase text-[#7A7571] font-medium block">Hard Ceiling</span>
          <div className="text-2xl font-medium tracking-tight text-[#111111] mt-0.5 tabular-nums">
            ${totalBudget.toLocaleString()}
          </div>
        </div>
        <div className="border-l border-[#14372D]/20 pl-4">
          <span className="text-xs uppercase text-[#7A7571] font-medium block">Total Estimated</span>
          <div className="text-2xl font-medium tracking-tight text-[#111111] mt-0.5 tabular-nums">
            ${totalEstimated.toLocaleString()}
          </div>
        </div>
        <div className="border-l border-[#14372D]/20 pl-4">
          <span className="text-xs uppercase text-[#7A7571] font-medium block">Actual Paid</span>
          <div className="text-2xl font-medium tracking-tight text-[#111111] mt-0.5 tabular-nums">
            ${totalActual.toLocaleString()}
          </div>
        </div>
        <div className="border-l border-[#14372D]/20 pl-4">
          <span className="text-xs uppercase text-[#7A7571] font-medium block">Buffer Variance</span>
          <div
            className={`text-2xl font-medium tracking-tight mt-0.5 tabular-nums ${
              variance >= 0 ? 'text-[#111111]' : 'text-rose-700'
            }`}
          >
            {variance >= 0 ? `+$${variance.toLocaleString()}` : `-$${Math.abs(variance).toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Visual Category Allocation Breakdown Strip (Missing Feature Added) */}
      {items.length > 0 && totalEstimated > 0 && (
        <div className="p-4 rounded-[12px] bg-white/60 border border-[#14372D]/15 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#7A7571] font-medium">
            <span className="flex items-center gap-1.5 text-[#111111]">
              <PieChart className="w-3.5 h-3.5 text-[#413936]" />
              <span>Capital Distribution Architecture</span>
            </span>
            <span className="tabular-nums font-mono">{items.length} Category Allocations</span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#DCD8D5]/40 p-0.5">
            {items.map((item, idx) => {
              const widthPct = (item.estimated_cost / totalEstimated) * 100;
              const color = terracottaPalette[idx % terracottaPalette.length];
              return (
                <div
                  key={item.id}
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:brightness-110"
                  title={`${item.category}: $${item.estimated_cost.toLocaleString()} (${widthPct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Micro Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#7A7571] pt-1">
            {items.slice(0, 6).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: terracottaPalette[idx % terracottaPalette.length] }}
                />
                <span className="truncate max-w-[140px] text-[#111111]">{item.category}</span>
                <span className="tabular-nums font-mono text-[#7A7571]">
                  {((item.estimated_cost / totalEstimated) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {items.length > 6 && (
              <span className="text-[#7A7571] text-[10px] italic">+{items.length - 6} more lines</span>
            )}
          </div>
        </div>
      )}

      {/* Filter, Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571]" />
          <input
            type="text"
            aria-label="Search allocations"
            placeholder="Search allocations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[36px] pl-9 pr-3 text-xs bg-white/70 border border-[#14372D]/20 rounded-full text-[#111111] focus:outline-none focus:border-[#111111]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#7A7571]" />
          <select
            aria-label="Sort budget items"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-[36px] px-3 bg-white/70 border border-[#14372D]/20 rounded-full text-xs text-[#111111] focus:outline-none cursor-pointer"
          >
            <option value="default">Default Order</option>
            <option value="cost-desc">Highest Cost First</option>
            <option value="cost-asc">Lowest Cost First</option>
            <option value="name">Category Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Add Custom Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateItem}
          className="p-5 rounded-[12px] bg-white/70 border border-[#14372D]/20 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Add Custom Allocation Line
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#7A7571] hover:text-[#111111]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Category</label>
              <input
                type="text"
                required
                placeholder="e.g., Bespoke Floral & Botanical Sculptures"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Estimated Cost ($)</label>
              <input
                type="number"
                min="0"
                required
                placeholder="e.g., 3500"
                value={newEstimatedCost}
                onChange={(e) => setNewEstimatedCost(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Notes / Scope</label>
              <input
                type="text"
                placeholder="e.g., Locally foraged seasonal centerpieces"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition"
            >
              Confirm Line Item
            </button>
          </div>
        </form>
      )}

      {/* Flat Editorial Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#111111]">
          <thead className="border-b border-[#14372D]/20 text-xs uppercase tracking-wider text-[#7A7571] font-medium">
            <tr>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3 text-right">Estimated</th>
              <th className="py-3 px-3 text-right">Actual Paid</th>
              <th className="py-3 px-3 text-center">Variance</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3">Notes</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#14372D]/10">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-[#7A7571]">
                  {searchQuery ? 'No allocations match your search.' : 'No allocations generated yet. Click "Synthesize Plan" to populate.'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isEditing = editingId === item.id;
                const percentOfBudget = totalBudget > 0 ? ((item.estimated_cost / totalBudget) * 100).toFixed(1) : 0;
                const lineVariance = item.actual_cost !== null ? item.estimated_cost - item.actual_cost : null;

                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-white/80 text-xs">
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          value={editEstimatedCost}
                          onChange={(e) => setEditEstimatedCost(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-24 px-2 py-1 bg-white border border-[#111111] rounded text-right text-[#111111]"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          placeholder="None"
                          value={editActualCost}
                          onChange={(e) => setEditActualCost(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-24 px-2 py-1 bg-white border border-[#111111] rounded text-right text-[#111111]"
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-[#7A7571]">—</td>
                      <td className="py-3 px-3 text-center">
                        <select
                          aria-label="Edit allocation status"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as BudgetItemStatus)}
                          className="px-2 py-1 bg-white border border-[#111111] rounded text-xs text-[#111111]"
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">Committed</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-[#111111] rounded text-[#111111]"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 bg-[#111111] text-[#EEEDEA] rounded hover:bg-[#413936] cursor-pointer"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-[#DCD8D5] text-[#111111] rounded hover:bg-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-black/5 transition cursor-pointer group"
                    onClick={() => startEditing(item)}
                  >
                    <td className="py-3.5 px-3 font-medium text-[#111111]">
                      <div className="flex items-center gap-2">
                        {item.is_user_edited && (
                          <span title="User-edited line (Locked during replan)">
                            <Lock className="w-3 h-3 text-[#413936] inline" />
                          </span>
                        )}
                        <span>{item.category}</span>
                        <span className="text-[11px] text-[#7A7571] tabular-nums font-normal">
                          · {percentOfBudget}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium text-[#111111] tabular-nums">
                      ${item.estimated_cost.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium tabular-nums">
                      {item.actual_cost !== null ? (
                        <span className="text-[#111111] font-semibold">
                          ${item.actual_cost.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[#7A7571] italic text-xs">—</span>
                      )}
                    </td>

                    {/* Row-level variance badge (Missing Feature Added) */}
                    <td className="py-3.5 px-3 text-center tabular-nums text-xs font-mono">
                      {lineVariance !== null ? (
                        lineVariance > 0 ? (
                          <span className="text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full font-medium">
                            +${lineVariance.toLocaleString()} Saved
                          </span>
                        ) : lineVariance < 0 ? (
                          <span className="text-rose-800 bg-rose-100/60 px-2 py-0.5 rounded-full font-medium">
                            -${Math.abs(lineVariance).toLocaleString()} Over
                          </span>
                        ) : (
                          <span className="text-[#7A7571]">Exact Target</span>
                        )
                      ) : (
                        <span className="text-[#7A7571]/50">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="text-xs uppercase tracking-wider font-medium text-[#413936]">
                        {item.status === 'paid' ? 'Paid' : item.status === 'in_progress' ? 'Committed' : 'Planned'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[#7A7571] max-w-xs truncate" title={item.notes}>
                      {item.notes || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1 text-[#7A7571] hover:text-[#111111] transition"
                          title="Edit line item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => withScrollLock(() => onDeleteItem(item.id))}
                          className="p-1 text-[#7A7571] hover:text-rose-700 transition"
                          title="Delete line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
