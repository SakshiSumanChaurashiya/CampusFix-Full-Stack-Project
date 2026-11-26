import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, CircleCheck, ClipboardList, Clock3,
  House, Menu, Plus, Search, Send, Sparkles, X
} from "lucide-react";

const categories = ["Electrical", "Plumbing", "Cleanliness", "Furniture", "Internet", "Safety", "Other"];
const statusLabels = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved"
};

function App() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("home");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "Other", location: "", description: "", reporter: ""
  });

  async function loadIssues() {
    try {
      setError("");
      const response = await fetch("/api/issues");
      if (!response.ok) throw new Error("Could not load reports.");
      const data = await response.json();
      setIssues(data.issues);
      setStats(data.stats);
    } catch (err) {
      setError(err.message || "Something went wrong while loading reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadIssues(); }, []);

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesStatus = filter === "all" || issue.status === filter;
      const matchesSearch = !term || [
        issue.title, issue.category, issue.location, issue.description, issue.ticketCode
      ].some((value) => String(value || "").toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [issues, search, filter]);

  function openReportForm() {
    setShowForm(true);
    setNotice("");
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitReport(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit report.");
      setForm({ title: "", category: "Other", location: "", description: "", reporter: "" });
      setShowForm(false);
      setActiveView("track");
      setNotice(`Your report was submitted. Ticket ID: ${data.issue.ticketCode}`);
      await loadIssues();
    } catch (err) {
      setNotice(err.message || "Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  function navigate(view) {
    setActiveView(view);
    setShowForm(false);
    setNotice("");
    if (view === "track") loadIssues();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-inner">
          <button className="brand" onClick={() => navigate("home")} aria-label="CampusFix home">
            <span className="brand-mark"><Sparkles size={19} fill="currentColor" /></span>
            <span>Campus<span>Fix</span></span>
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={activeView === "home" ? "nav-link active" : "nav-link"} onClick={() => navigate("home")}>Dashboard</button>
            <button className="nav-link" onClick={openReportForm}>Report an issue</button>
            <button className={activeView === "track" ? "nav-link active" : "nav-link"} onClick={() => navigate("track")}>Track issues</button>
          </nav>
          <button className="button button-small" onClick={openReportForm}><Plus size={15} /> New report</button>
          <button className="mobile-menu" onClick={() => navigate("track")} aria-label="Open issue tracker"><Menu /></button>
        </div>
      </header>

      {activeView === "home" ? (
        <>
          <main>
            <section className="hero">
              <div className="hero-inner">
                <div className="hero-copy">
                  <div className="eyebrow"><span className="eyebrow-dot" /> Your campus, your voice</div>
                  <h1>Let's make our<br /><em>campus better.</em></h1>
                  <p className="hero-description">Spot a problem? Report it in seconds. Track progress transparently<br className="desktop-break" /> and help create a safer, cleaner campus for everyone.</p>
                  <div className="hero-actions">
                    <button className="button" onClick={openReportForm}>Report an issue <ArrowUpRight size={16} /></button>
                    <button className="text-button" onClick={() => navigate("track")}>View reported issues <span>→</span></button>
                  </div>
                  <div className="social-proof">
                    <div className="avatar-stack"><span>A</span><span>D</span><span>K</span><span>+</span></div>
                    <span>Small reports. Meaningful change.</span>
                  </div>
                </div>
                <div className="hero-art" aria-label="Campus care illustration">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                  <div className="care-card">
                    <div className="care-card-top"><span className="home-icon"><House size={20} /></span><Sparkles size={15} className="gold" fill="currentColor" /></div>
                    <strong>Campus care</strong>
                    <small>Starts with you.</small>
                  </div>
                  <div className="float-tag tag-received"><Check size={13} /> Issue received</div>
                  <div className="float-tag tag-progress"><span className="gold-dot" /> Making progress</div>
                </div>
              </div>
            </section>

            <section className="stats-section" aria-label="Issue statistics">
              <div className="stats-grid">
                <Stat label="Total reports" value={stats.total} helper="Issues raised by students" />
                <Stat label="Open" value={stats.open} helper="Waiting for attention" />
                <Stat label="In progress" value={stats.inProgress} helper="Being worked on" />
                <Stat label="Resolved" value={stats.resolved} helper="Campus improvements" />
              </div>
            </section>

            <section className="recent-section section-wrap">
              <div className="section-heading">
                <div><div className="eyebrow">Community updates</div><h2>Recent reports</h2></div>
                <button className="text-button" onClick={() => navigate("track")}>See all issues <span>→</span></button>
              </div>
              <IssueList issues={issues.slice(0, 3)} loading={loading} />
            </section>
          </main>
        </>
      ) : (
        <main className="tracker-page section-wrap">
          <div className="tracker-heading">
            <div><div className="eyebrow">The community board</div><h1>Track <em>issues.</em></h1><p>Every report matters. Follow updates and see what's getting fixed.</p></div>
            <button className="button" onClick={openReportForm}><Plus size={16} /> New report</button>
          </div>
          <div className="filter-bar">
            <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports, locations or ticket IDs" aria-label="Search reports" /></div>
            <div className="select-wrap"><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="open">Open</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select><ChevronDown size={15} /></div>
          </div>
          {notice && <div className="notice"><CircleCheck size={17} /> {notice}</div>}
          {error && <div className="error-box">{error} <button onClick={loadIssues}>Try again</button></div>}
          <IssueList issues={filteredIssues} loading={loading} />
          {!loading && filteredIssues.length === 0 && <div className="empty-state"><ClipboardList size={28} /><strong>No reports found</strong><span>Try another search or create a new report.</span></div>}
        </main>
      )}

      {error && activeView === "home" && <div className="global-error">{error} <button onClick={loadIssues}>Retry</button></div>}

      <footer className="footer"><span className="footer-brand"><Sparkles size={15} /> CampusFix</span><span>Small reports. Meaningful change.</span><span>Made for a better campus.</span></footer>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="modal-heading"><div><div className="eyebrow">Make a difference</div><h2 id="report-title">Report an <em>issue.</em></h2></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form"><X /></button></div>
            <p className="modal-intro">Tell us what's happening and our campus team can take a look.</p>
            <form onSubmit={submitReport}>
              <label>Issue title<input name="title" value={form.title} onChange={updateField} placeholder="e.g. Broken light near library" minLength="4" maxLength="100" required /></label>
              <div className="form-row">
                <label>Category<select name="category" value={form.category} onChange={updateField}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Your name <span className="optional">(optional)</span><input name="reporter" value={form.reporter} onChange={updateField} placeholder="Name" maxLength="60" /></label>
              </div>
              <label>Location<input name="location" value={form.location} onChange={updateField} placeholder="e.g. Block A, second floor" minLength="2" maxLength="120" required /></label>
              <label>Description<textarea name="description" value={form.description} onChange={updateField} placeholder="Share a few details to help us understand the issue..." minLength="10" maxLength="1000" rows="4" required /></label>
              <div className="form-footer"><span>Required fields are marked by the form.</span><button className="button" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit report"} <Send size={15} /></button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, helper }) {
  return <div className="stat"><span className="stat-label">{label}</span><strong>{value ?? "—"}</strong><small>{helper}</small></div>;
}

function IssueList({ issues, loading }) {
  if (loading) return <div className="loading-state"><span className="spinner" /> Loading reports...</div>;
  if (!issues.length) return <div className="empty-inline">No reports yet. Be the first to help improve your campus.</div>;
  return <div className="issue-list">{issues.map((issue) => (
    <article className="issue-card" key={issue.id}>
      <div className="issue-icon"><ClipboardList size={19} /></div>
      <div className="issue-main"><div className="issue-title-row"><h3>{issue.title}</h3><span className={`status status-${issue.status}`}>{statusLabels[issue.status] || issue.status}</span></div><p>{issue.description}</p><div className="issue-meta"><span>{issue.category}</span><span>•</span><span>{issue.location}</span><span>•</span><span>{issue.ticketCode}</span></div></div>
      <div className="issue-date"><Clock3 size={13} /> {new Date(issue.createdAt).toLocaleDateString()}</div>
    </article>
  ))}</div>;
}

export default App;
