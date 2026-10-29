import React, { useState, useEffect } from "react";
import {
  Brain,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  RefreshCw,
  Database,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Search
} from "lucide-react";
import {
  subscribeMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  subscribeConversations,
  clearAllConversations,
  subscribeReminders,
  deleteReminderDoc,
  type MemoryItem,
  type ConversationItem,
  type ReminderItem
} from "../lib/firebase";

export const FirebaseMemoryManager: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"memories" | "chat" | "reminders">("memories");
  const [searchQuery, setSearchQuery] = useState("");

  // New Memory state
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("preference");

  // Editing Memory state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Status message
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubMem = subscribeMemories((list) => setMemories(list));
    const unsubConv = subscribeConversations((list) => setConversations(list));
    const unsubRem = subscribeReminders((list) => setReminders(list));

    return () => {
      unsubMem();
      unsubConv();
      unsubRem();
    };
  }, []);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    try {
      await addMemory(newText.trim(), newCategory);
      setNewText("");
      showStatus("Memory saved to Firestore!");
    } catch (err: any) {
      showStatus("Error saving memory: " + (err.message || err));
    }
  };

  const handleStartEdit = (item: MemoryItem) => {
    if (!item.id) return;
    setEditingId(item.id);
    setEditText(item.text);
    setEditCategory(item.category || "general");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await updateMemory(id, editText.trim(), editCategory);
      setEditingId(null);
      showStatus("Memory updated successfully!");
    } catch (err: any) {
      showStatus("Error updating memory: " + (err.message || err));
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteMemory(id);
      showStatus("Memory deleted from Firestore.");
    } catch (err: any) {
      showStatus("Error deleting memory: " + (err.message || err));
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all stored conversation history in Firestore?")) {
      try {
        await clearAllConversations();
        showStatus("Conversation history cleared.");
      } catch (err: any) {
        showStatus("Error clearing history: " + (err.message || err));
      }
    }
  };

  const safeMemories = Array.isArray(memories) ? memories : [];
  const filteredMemories = safeMemories.filter(
    (m) =>
      m &&
      ((m.text && m.text.toLowerCase().includes((searchQuery || "").toLowerCase())) ||
        (m.category && m.category.toLowerCase().includes((searchQuery || "").toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-950 border border-cyan-500/25 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              FIRESTORE MEMORY & HISTORY BANK
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                REALTIME SYNCED
              </span>
            </h3>
            <p className="text-xs text-white/50 font-mono">
              Tune remembers all your preferences, past topics, notes, and task logs here.
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-mono animate-pulse">
          {statusMsg}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab("memories")}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-2 ${
            activeSubTab === "memories"
              ? "bg-cyan-500 text-zinc-950"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          Memories ({memories.length})
        </button>

        <button
          onClick={() => setActiveSubTab("chat")}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-2 ${
            activeSubTab === "chat"
              ? "bg-cyan-500 text-zinc-950"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat Logs ({conversations.length})
        </button>

        <button
          onClick={() => setActiveSubTab("reminders")}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-2 ${
            activeSubTab === "reminders"
              ? "bg-cyan-500 text-zinc-950"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Reminders ({reminders.length})
        </button>
      </div>

      {/* TAB 1: MEMORIES */}
      {activeSubTab === "memories" && (
        <div className="space-y-4">
          {/* Add New Memory Form */}
          <form onSubmit={handleAddMemory} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> ADD NEW MEMORY TO TUNE'S BRAIN
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g., 'Prefers dark theme', 'Favorite coffee is Cappuccino', 'Studies Computer Science'"
                className="flex-1 bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="preference">Preference</option>
                <option value="personal_fact">Personal Fact</option>
                <option value="habit">Habit / Schedule</option>
                <option value="work">Work / Study</option>
                <option value="general">General Note</option>
              </select>
              <button
                type="submit"
                disabled={!newText.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl text-xs transition disabled:opacity-40 font-mono flex items-center gap-1.5 justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Memory
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stored memories..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          {/* Memory List */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredMemories.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs font-mono bg-white/5 rounded-2xl border border-white/5">
                No memories found. Add one above or chat with Tune to build memory!
              </div>
            ) : (
              filteredMemories.map((m) => (
                <div
                  key={m.id}
                  className="bg-zinc-900/80 border border-white/10 hover:border-cyan-500/30 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                >
                  {editingId === m.id ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 bg-black border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="bg-black border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono"
                      >
                        <option value="preference">Preference</option>
                        <option value="personal_fact">Personal Fact</option>
                        <option value="habit">Habit / Schedule</option>
                        <option value="work">Work / Study</option>
                        <option value="general">General Note</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(m.id!)}
                          className="p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl hover:bg-emerald-500/30 transition"
                          title="Save Changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-white/5 text-white/50 rounded-xl hover:bg-white/10 transition"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 uppercase">
                            {m.category || "general"}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono">
                            {m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-white font-mono">{m.text}</p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="p-2 bg-white/5 hover:bg-cyan-500/20 text-white/60 hover:text-cyan-300 border border-white/10 rounded-xl transition"
                          title="Edit Memory"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(m.id!)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition"
                          title="Delete Memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CHAT LOGS */}
      {activeSubTab === "chat" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50 font-mono">
              Stored chat transcript logs in Firestore ({conversations.length} items)
            </span>
            {conversations.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-mono transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Clear All Logs
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs font-mono bg-white/5 rounded-2xl border border-white/5">
                No past conversation logs stored.
              </div>
            ) : (
              conversations.map((c, i) => (
                <div
                  key={c.id || i}
                  className={`p-3 rounded-2xl border text-xs font-mono space-y-1 ${
                    c.role === "user"
                      ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                      : "bg-zinc-900 border-white/10 text-white/90"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <span className="font-bold text-cyan-400 uppercase">{c.role}</span>
                    <span>{c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : ""}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REMINDERS */}
      {activeSubTab === "reminders" && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs font-mono bg-white/5 rounded-2xl border border-white/5">
                No active Firestore reminders.
              </div>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className="bg-zinc-900 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 font-mono text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-white font-semibold">{r.title}</span>
                    </div>
                    <span className="text-[10px] text-white/40">
                      Scheduled for: {r.time} ({r.completed ? "Completed" : "Pending"})
                    </span>
                  </div>

                  <button
                    onClick={() => deleteReminderDoc(r.id!)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
