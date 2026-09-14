import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  ListChecks,
  Lightbulb,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Search,
  Check,
  ChevronDown,
  Send,
} from "lucide-react";
import { analyzeNote, chatAboutNote, checkAiHealth } from "../../services/aiApi";
import "./NoteAnalysisView.css";

const STEPS = [
  { id: "summary", label: "Summary", Icon: FileText },
  { id: "tasks", label: "Tasks", Icon: ListChecks },
  { id: "learn", label: "Learn", Icon: Lightbulb },
  { id: "ask", label: "Ask", Icon: MessageCircle },
];

const MODES = [
  { id: "quick", label: "Quick", Icon: Zap, hint: "Short summary + top tasks" },
  { id: "full", label: "Full", Icon: Search, hint: "Complete breakdown" },
];

const CHAT_STARTERS = [
  "What should I focus on?",
  "Explain this simply",
  "What's missing?",
];

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NoteAnalysisView({ note, onSaveAnalysis, compact = false }) {
  const [serverOk, setServerOk] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [mode, setMode] = useState("quick");
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkedActions, setCheckedActions] = useState({});
  const [openConcept, setOpenConcept] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (step.id === "ask") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading, step.id]);

  useEffect(() => {
    checkAiHealth()
      .then((data) => setServerOk(data.ok && data.hasKey))
      .catch(() => setServerOk(false));
  }, []);

  useEffect(() => {
    if (note?.aiAnalysis) {
      setAnalysis(note.aiAnalysis);
      setCheckedActions(note.aiAnalysis.checkedActions || {});
    } else {
      setAnalysis(null);
      setCheckedActions({});
    }
    setChatMessages([]);
    setError(null);
    setStepIndex(0);
    setOpenConcept(null);
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = useCallback(async () => {
    if (!note || isLoading) return;

    const text = stripHtml(note.content || note.title || "");
    if (text.length < 10) {
      setError("Note is too short. Write a bit more, then try again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStepIndex(0);

    try {
      const result = await analyzeNote({
        title: note.title,
        content: note.content,
        mode,
      });
      setAnalysis(result);
      setCheckedActions({});
      onSaveAnalysis?.(note.id, result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [note, isLoading, mode, onSaveAnalysis]);

  const toggleAction = (id) => {
    const next = { ...checkedActions, [id]: !checkedActions[id] };
    setCheckedActions(next);
    if (analysis && note) {
      onSaveAnalysis?.(note.id, { ...analysis, checkedActions: next });
    }
  };

  const sendChat = async (text) => {
    const message = (text || chatInput).trim();
    if (!message || chatLoading || !note) return;

    setChatInput("");
    const userMsg = { role: "user", text: message };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatLoading(true);

    try {
      const { reply } = await chatAboutNote({
        title: note.title,
        content: note.content,
        message,
        history: chatMessages,
      });
      setChatMessages([...newHistory, { role: "assistant", text: reply }]);
    } catch (err) {
      setChatMessages([...newHistory, { role: "assistant", text: err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const tasksDone = analysis?.actionItems
    ? Object.values(checkedActions).filter(Boolean).length
    : 0;
  const tasksTotal = analysis?.actionItems?.length || 0;

  if (!note) {
    return (
      <div className={`nav-analysis ${compact ? "nav-analysis--compact" : ""}`}>
        <div className="nav-analysis__idle">
          <FileText size={32} strokeWidth={1.5} />
          <p>Select a note to start AI analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`nav-analysis ${compact ? "nav-analysis--compact" : ""}`}>
      {serverOk === false && (
        <div className="nav-analysis__alert" style={{ background: "#f7f7f5", borderColor: "#edece9", color: "#787774" }}>
          <Sparkles size={14} color="#37352f" />
          Offline Analysis Engine active (Add DEEPSEEK_API_KEY in .env for DeepSeek model)
        </div>
      )}
      {serverOk === true && (
        <div className="nav-analysis__alert" style={{ background: "#fdfdfc", borderColor: "#edece9", color: "#37352f" }}>
          <Sparkles size={14} color="#2383e2" />
          DeepSeek AI Model Connected
        </div>
      )}

      {!analysis && !isLoading && (
        <div className="nav-analysis__setup">
          <div className="nav-analysis__setup-icon">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <h3>Analyze this note</h3>
          <p>Pick how deep you want the breakdown, then start.</p>
          <div className="nav-mode-picker">
            {MODES.map(({ id, label, Icon, hint }) => (
              <button
                key={id}
                type="button"
                className={`nav-mode ${mode === id ? "nav-mode--active" : ""}`}
                onClick={() => setMode(id)}
              >
                <Icon size={18} />
                <span className="nav-mode__label">{label}</span>
                <span className="nav-mode__hint">{hint}</span>
              </button>
            ))}
          </div>
          <button type="button" className="nav-analysis__start" onClick={runAnalysis}>
            Start analysis
          </button>
        </div>
      )}

      {isLoading && (
        <div className="nav-analysis__loading">
          <Loader2 size={24} className="nav-spin" />
          <p>Analyzing your note...</p>
        </div>
      )}

      {error && (
        <div className="nav-analysis__error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!isLoading && analysis && (
        <>
          <nav className="nav-stepper" aria-label="Analysis steps">
            {STEPS.map(({ id, label, Icon }, i) => (
              <button
                key={id}
                type="button"
                className={`nav-stepper__item ${i === stepIndex ? "is-active" : ""} ${i < stepIndex ? "is-done" : ""}`}
                onClick={() => setStepIndex(i)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="nav-step-card">
            <div className="nav-step-card__head">
              <step.Icon size={18} />
              <h3>{step.label}</h3>
              <button type="button" className="nav-refresh" onClick={runAnalysis} title="Re-analyze">
                <RefreshCw size={15} />
              </button>
            </div>

            {step.id === "summary" && (
              <div className="nav-step">
                <p className="nav-step__lead">{analysis.summary}</p>
                {analysis.keyPoints?.length > 0 && (
                  <ul className="nav-step__list">
                    {analysis.keyPoints.slice(0, 4).map((kp) => (
                      <li key={kp.id}>{kp.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step.id === "tasks" && (
              <div className="nav-step">
                {tasksTotal === 0 ? (
                  <p className="nav-step__empty">No tasks found.</p>
                ) : (
                  <>
                    <div className="nav-step__progress">
                      <div className="nav-step__progress-bar" style={{ width: `${(tasksDone / tasksTotal) * 100}%` }} />
                    </div>
                    <p className="nav-step__progress-label">{tasksDone} of {tasksTotal} done</p>
                    <div className="nav-task-list">
                      {analysis.actionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`nav-task ${checkedActions[item.id] ? "nav-task--done" : ""}`}
                          onClick={() => toggleAction(item.id)}
                        >
                          <span className="nav-task__check">
                            {checkedActions[item.id] ? <Check size={14} /> : null}
                          </span>
                          <span className="nav-task__text">{item.text}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {step.id === "learn" && (
              <div className="nav-step">
                {analysis.concepts?.map((c) => (
                  <div key={c.id} className="nav-concept">
                    <button type="button" className="nav-concept__toggle" onClick={() => setOpenConcept(openConcept === c.id ? null : c.id)}>
                      <span>{c.term}</span>
                      <ChevronDown size={16} className={openConcept === c.id ? "is-open" : ""} />
                    </button>
                    {openConcept === c.id && <p className="nav-concept__def">{c.definition}</p>}
                  </div>
                ))}
                {analysis.openQuestions?.length > 0 && (
                  <ol className="nav-question-list">
                    {analysis.openQuestions.map((q) => (
                      <li key={q.id}>{q.text}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {step.id === "ask" && (
              <div className="nav-step nav-step--chat">
                <div className="nav-chat-msgs">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`nav-chat-bubble nav-chat-bubble--${msg.role}`}>{msg.text}</div>
                  ))}
                  {chatLoading && (
                    <div className="nav-chat-loading">
                      <Loader2 size={16} className="nav-spin" />
                      Thinking...
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <div className="nav-chat-starters">
                  {CHAT_STARTERS.map((s) => (
                    <button key={s} type="button" className="nav-chat-starter" disabled={chatLoading} onClick={() => sendChat(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="nav-chat-input">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Your question..."
                    disabled={chatLoading}
                  />
                  <button type="button" disabled={chatLoading || !chatInput.trim()} onClick={() => sendChat()}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="nav-step-nav">
            <button type="button" className="nav-step-nav__btn" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
            <span className="nav-step-nav__count">{stepIndex + 1} / {STEPS.length}</span>
            <button
              type="button"
              className="nav-step-nav__btn nav-step-nav__btn--primary"
              disabled={stepIndex === STEPS.length - 1}
              onClick={() => setStepIndex((i) => i + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
