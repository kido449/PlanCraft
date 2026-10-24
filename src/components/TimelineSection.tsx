import React, { useState } from 'react';
import { TimelineTaskRecord, TimelineTaskStatus } from '../types';
import { withScrollLock } from '../utils/scrollStability';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Check,
  Lock,
  Clock,
  Search,
  ListOrdered,
} from 'lucide-react';

interface TimelineSectionProps {
  tasks: TimelineTaskRecord[];
  eventDate: string;
  onUpdateTask: (id: string, updates: Partial<TimelineTaskRecord>) => Promise<void>;
  onAddTask: (task: Omit<TimelineTaskRecord, 'id' | 'event_id'>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

// Default Day-of hourly itinerary benchmarks synthesized based on event date
interface DayOfItem {
  id: string;
  time: string;
  title: string;
  role: string;
  notes: string;
}

const DEFAULT_RUN_OF_SHOW: DayOfItem[] = [
  { id: 'ros-1', time: '09:00 AM', title: 'Venue Load-in & Facility Access', role: 'Production Crew', notes: 'Ensure loading dock open and staging tables positioned.' },
  { id: 'ros-2', time: '11:00 AM', title: 'Floral & Decor Deliveries', role: 'Floral Designer', notes: 'Setup ceremony arch, centerpieces, and guestbook station.' },
  { id: 'ros-3', time: '01:30 PM', title: 'Audio/Visual & Soundcheck', role: 'Sound Engineer / DJ', notes: 'Microphone checks, ambient lighting presets, playlist cue test.' },
  { id: 'ros-4', time: '03:30 PM', title: 'Catering Prep & Beverage Bar Setup', role: 'Catering Captain', notes: 'Ice, glassware, hors d’oeuvres prep, vendor meal staging.' },
  { id: 'ros-5', time: '04:30 PM', title: 'Guest Arrival & Welcome Courtyard Reception', role: 'Greeters & Host', notes: 'Welcome drinks, coat check, acoustic background music.' },
  { id: 'ros-6', time: '05:30 PM', title: 'Main Ceremony / Opening Presentation', role: 'Officiant / MC', notes: 'Processional entrance, focal lighting, transition to dinner.' },
  { id: 'ros-7', time: '07:00 PM', title: 'Dinner Service & Speeches / Toasts', role: 'Catering Team & MC', notes: 'Plated dinner or stations, scheduled speaker toasts.' },
  { id: 'ros-8', time: '09:00 PM', title: 'Celebration, Music & Interactive Entertainment', role: 'Live Band / DJ', notes: 'Dance floor opens, dessert station, candid photography.' },
  { id: 'ros-9', time: '11:30 PM', title: 'Grand Exit & Facility Teardown', role: 'Coordinator & Venue Staff', notes: 'Vendor breakdown, transport coordination, deposit checkout.' },
];

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  tasks,
  eventDate,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [viewMode, setViewMode] = useState<'roadmap' | 'run-of-show'>('roadmap');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<TimelineTaskStatus>('pending');
  const [editNotes, setEditNotes] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Preparation');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Day-of run of show state (customizable)
  const [runOfShowList, setRunOfShowList] = useState<DayOfItem[]>(DEFAULT_RUN_OF_SHOW);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending' && t.status === 'completed') return false;
    if (filter === 'completed' && t.status !== 'completed') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const toggleTaskStatus = async (task: TimelineTaskRecord) => {
    const nextStatus: TimelineTaskStatus =
      task.status === 'completed' ? 'pending' : 'completed';
    await withScrollLock(() => onUpdateTask(task.id, { status: nextStatus }));
  };

  const startEditing = (task: TimelineTaskRecord) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditDueDate(task.due_date);
    setEditStatus(task.status);
    setEditNotes(task.notes || '');
  };

  const saveEdit = async (id: string) => {
    await withScrollLock(async () => {
      await onUpdateTask(id, {
        title: editTitle,
        category: editCategory,
        due_date: editDueDate,
        status: editStatus,
        notes: editNotes,
      });
      setEditingId(null);
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await withScrollLock(async () => {
      await onAddTask({
        title: newTitle.trim(),
        category: newCategory.trim() || 'General',
        due_date: newDueDate || new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: newNotes.trim(),
      });

      setNewTitle('');
      setNewCategory('Preparation');
      setNewDueDate('');
      setNewNotes('');
      setShowAddForm(false);
    });
  };

  const getDaysUntilDue = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <section className="bg-transparent border border-[#14372D]/20 rounded-[16px] p-6 sm:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#14372D]/15 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#7A7571] font-medium block mb-1">
            02 // Chronological Execution
          </span>
          <h3 className="text-2xl sm:text-3xl font-medium tracking-[-1.5px] text-[#111111]">
            Milestone <span className="accent-serif">cadence</span> & timeline
          </h3>
          <p className="text-sm text-[#7A7571] mt-1 font-normal">
            Target date: {eventDate} · {completedCount} of {tasks.length} tasks accomplished ({progressPercent}%)
          </p>
        </div>

        {/* View Switcher: Planning Roadmap vs Day-of Run of Show */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center border border-[#14372D]/20 rounded-full p-0.5 text-xs bg-white/50">
            <button
              onClick={() => setViewMode('roadmap')}
              className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium ${
                viewMode === 'roadmap' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Milestones ({tasks.length})</span>
            </button>
            <button
              onClick={() => setViewMode('run-of-show')}
              className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium ${
                viewMode === 'run-of-show' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Day-of Itinerary</span>
            </button>
          </div>

          {viewMode === 'roadmap' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-[36px] px-3.5 rounded-full bg-[#111111] hover:bg-[#413936] text-[#EEEDEA] text-xs font-medium transition active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'roadmap' ? (
        <>
          {/* Thin Hairline Progress */}
          <div className="w-full h-1 bg-[#14372D]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#111111] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7571]" />
              <input
                type="text"
                aria-label="Search milestones"
                placeholder="Search milestones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[34px] pl-9 pr-3 text-xs bg-white/70 border border-[#14372D]/20 rounded-full text-[#111111] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="inline-flex items-center border border-[#14372D]/20 rounded-full p-0.5 text-xs bg-white/40">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  filter === 'all' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  filter === 'pending' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
                }`}
              >
                Pending ({tasks.length - completedCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  filter === 'completed' ? 'bg-[#111111] text-[#EEEDEA]' : 'text-[#7A7571] hover:text-[#111111]'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>
          </div>

          {/* Add Task Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateTask}
              className="p-5 rounded-[12px] bg-white/70 border border-[#14372D]/20 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                  Add New Milestone
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
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-[#111111] mb-1">Milestone Action</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Finalize floor plan with venue director"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Production / Logistics"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Scope Details</label>
                <input
                  type="text"
                  placeholder="e.g., Confirm acoustic load limitations and power supplies"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCD8D5] rounded-[8px] text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-full bg-[#111111] text-[#EEEDEA] hover:bg-[#413936] transition"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          )}

          {/* Task Stack */}
          <div className="divide-y divide-[#14372D]/10">
            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A7571]">
                {searchQuery ? 'No milestones match your search.' : 'No milestones found.'}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isEditing = editingId === task.id;
                const isCompleted = task.status === 'completed';
                const daysLeft = getDaysUntilDue(task.due_date);

                if (isEditing) {
                  return (
                    <div key={task.id} className="p-4 bg-white/80 rounded-[8px] border border-[#111111] space-y-3 text-xs my-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#111111] rounded text-[#111111] sm:col-span-2"
                          placeholder="Task Title"
                        />
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#111111] rounded text-[#111111]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#111111] rounded text-[#111111]"
                          placeholder="Category"
                        />
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#111111] rounded text-[#111111]"
                          placeholder="Notes"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-[#DCD8D5] text-[#111111] rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(task.id)}
                          className="px-3 py-1 bg-[#111111] text-[#EEEDEA] rounded hover:bg-[#413936] font-medium"
                        >
                          Save Task
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={task.id}
                    className="py-4 flex items-center justify-between gap-4 group transition-colors hover:bg-black/[0.02] px-2 rounded-[6px]"
                  >
                    {/* Left: Radio Check + Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-[#111111] border-[#111111] text-[#EEEDEA]'
                            : 'border-[#14372D]/40 hover:border-[#111111]'
                        }`}
                        title={isCompleted ? 'Mark pending' : 'Mark complete'}
                      >
                        {isCompleted && <Check className="w-3 h-3" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              isCompleted ? 'line-through text-[#7A7571]' : 'text-[#111111]'
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.is_user_edited && (
                            <span title="User-edited milestone (Protected during replan)">
                              <Lock className="w-3 h-3 text-[#413936] inline" />
                            </span>
                          )}
                          <span className="text-[11px] text-[#7A7571] font-normal">
                            · {task.category}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-xs text-[#7A7571] mt-0.5 line-clamp-1">{task.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Date & Actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-[#111111] font-medium block tabular-nums">
                          {task.due_date}
                        </span>
                        <span className="text-[11px] text-[#7A7571] block">
                          {isCompleted ? 'Completed' : daysLeft > 0 ? `${daysLeft}d left` : 'Due'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition">
                        <button
                          onClick={() => startEditing(task)}
                          className="p-1 text-[#7A7571] hover:text-[#111111]"
                          title="Edit task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => withScrollLock(() => onDeleteTask(task.id))}
                          className="p-1 text-[#7A7571] hover:text-rose-700"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Day-of Run-of-Show View (Missing Feature Added) */
        <div className="space-y-4">
          <div className="p-4 rounded-[12px] bg-white/60 border border-[#14372D]/15 flex items-center justify-between text-xs text-[#7A7571]">
            <span className="flex items-center gap-1.5 text-[#111111] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#413936]" />
              <span>Day-of Hourly Run of Show ({eventDate})</span>
            </span>
            <span>Synthesized for on-site coordinator & crew</span>
          </div>

          <div className="divide-y divide-[#14372D]/10 border border-[#14372D]/15 rounded-[12px] overflow-hidden bg-white/40">
            {runOfShowList.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/70 transition">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-20 font-mono text-xs font-semibold text-[#111111] shrink-0 tabular-nums">
                    {item.time}
                  </div>
                  <div>
                    <span className="font-medium text-sm text-[#111111] block">{item.title}</span>
                    <span className="text-xs text-[#7A7571] mt-0.5 block">{item.notes}</span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#111111]/5 text-[#413936] font-medium border border-[#14372D]/10">
                    Lead: {item.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
