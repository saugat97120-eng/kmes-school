// Phase 10 — AI Assist panel for the Review workspace.
//
// Every AI result is a SUGGESTION. It is never applied automatically; the human
// explicitly Accepts / Edits-then-Applies / Keeps Current / Copies. The UI makes
// clear that "AI suggestion ≠ approved content".
import { useState } from "react";
import { Sparkles, Loader2, Check, X, Copy, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { api, canUseAI } from "./api";

const ACTIONS = [
  { id: "suggest_title", label: "Suggest Title", types: ["notices", "events", "gallery", "achievements", "facilities", "activities"] },
  { id: "improve_description", label: "Improve Description", types: ["notices", "events", "achievements", "facilities", "activities"] },
  { id: "summarize", label: "Summarize", types: ["notices", "events", "achievements", "facilities", "activities"] },
  { id: "generate_short_description", label: "Short Description", types: ["notices", "events", "achievements", "facilities", "activities"] },
  { id: "suggest_tags", label: "Suggest Tags", types: ["notices", "events", "achievements", "gallery"] },
  { id: "generate_caption", label: "Facebook Caption", types: ["notices", "events", "achievements", "facilities", "activities"] },
  { id: "extract_event_details", label: "Extract Event Details", types: ["events"] },
  { id: "rewrite_notice", label: "Rewrite Notice", types: ["notices"] },
];

export default function AIAssist({ type, id, onApplied }) {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState("");

  const hasPermission = canUseAI();
  const available = ACTIONS.filter((a) => a.types.includes(type));

  const reset = () => {
    setSuggestion(null);
    setEditable("");
    setCopied(false);
    setError("");
  };

  const run = async (act) => {
    setLoading(true);
    setError("");
    setSuggestion(null);
    setCopied(false);
    setEditable("");
    try {
      const res = await api.aiSuggest(type, id, act);
      setSuggestion(res.data);
    } catch (e) {
      setError(e.message || "AI request failed.");
    } finally {
      setLoading(false);
    }
  };

  const applyEdits = async () => {
    if (!suggestion) return;
    setApplying(true);
    setError("");
    try {
      // value = the accepted suggestion value. If the human edited it, the human
      // version wins (never silently overwrite human edits).
      const value = { ...suggestion.value };
      if (suggestion.action === "suggest_title") value.title = editable;
      else if (suggestion.action === "suggest_tags") value.category = editable;
      else value.description = editable;
      await api.aiApply(type, id, suggestion.action, value);
      onApplied?.(suggestion.action);
      reset();
    } catch (e) {
      setError(e.message || "Could not apply the edited suggestion.");
    } finally {
      setApplying(false);
    }
  };

  const keep = () => reset();

  const copy = async () => {
    const text = suggestionCaption(suggestion);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const beginEdit = () => {
    if (!suggestion) return;
    setEditable(suggestionText(suggestion) || "");
  };

  if (!hasPermission) return null;

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
          <Sparkles size={14} /> AI Assist
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">suggestion only</span>
        </span>
        <ChevronDown size={15} className={`text-violet-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-violet-100 bg-white p-4">
          {!suggestion && !loading && (
            <>
              <p className="mb-3 text-xs text-gray-500">
                AI generates <strong>suggestions only</strong>. Nothing is changed until you explicitly accept it. Factual details are never invented.
              </p>
              <div className="flex flex-wrap gap-2">
                {available.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => run(a.id)}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Sparkles size={12} /> {a.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-violet-700">
              <Loader2 size={15} className="animate-spin" /> Generating suggestion…
            </div>
          )}

          {suggestion && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                AI Suggestion · {ACTIONS.find((a) => a.id === suggestion.action)?.label || suggestion.action}
              </p>
              {suggestion.summary && <p className="text-xs italic text-gray-400">{suggestion.summary}</p>}

              <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3">
                <p className="text-xs text-gray-500">AI suggested value</p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{suggestionText(suggestion)}</p>
                {suggestion.warnings?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {suggestion.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Edit before applying (optional)</label>
                <textarea
                  value={editable}
                  onChange={(e) => setEditable(e.target.value)}
                  rows={3}
                  placeholder="Optionally edit the AI suggestion here. Your edits win."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={beginEdit} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100">
                  <RefreshCw size={12} /> Load into editor
                </button>
                <button onClick={copy} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100">
                  <Copy size={12} /> {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={keep} className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">
                  <X size={12} /> Keep Current
                </button>
                <button
                  onClick={applyEdits}
                  disabled={applying}
                  className="flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Check size={12} /> {applying ? "Applying…" : "Accept & Apply"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle size={13} /> {error}</p>}
        </div>
      )}
    </section>
  );
}

function suggestionText(s) {
  const v = s?.value || {};
  if (s?.action === "suggest_title") return v.title || "";
  if (s?.action === "suggest_tags") return v.category || "";
  if (s?.action === "extract_event_details") {
    return [v.title, v.date, v.time, v.location, v.description].filter(Boolean).join(" · ");
  }
  return v.description || v.caption || v.text || "";
}

function suggestionCaption(s) {
  if (s?.action === "generate_caption") return s?.value?.caption || "";
  return suggestionText(s);
}