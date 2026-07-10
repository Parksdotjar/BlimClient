import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const nav = [
  ['⌂', 'Home'], ['⌘', 'Mods'], ['▣', 'Resource Packs'], ['◇', 'Shaders'], ['⚙', 'Settings'],
];
const quickActions = [
  ['✣', 'Browse Mods', 'Find and install mods\nfrom Modrinth', 'green'],
  ['▰', 'Resource Packs', 'Browse and manage\nyour resource packs', 'gold'],
  ['◈', 'Shaders', 'Manage your\nshader packs', 'blue'],
  ['⚙', 'Settings', 'Configure client\npreferences', 'slate'],
];

function EmptySlot({ title = 'Empty slot', sub = 'Create an instance to get started' }: { title?: string; sub?: string }) {
  return <div className="empty-slot"><span className="empty-plus">＋</span><div><strong>{title}</strong><p>{sub}</p></div></div>;
}

function App() {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/bloom-logo.png" alt="Bloom logo" /><div><b>Bloom Client</b><span>Minecraft Client</span></div></div>
      <button className="new-instance">＋ <span>New instance</span></button>
      <nav>{nav.map(([icon, label], index) => <button className={index === 0 ? 'active' : ''} key={label}><i>{icon}</i>{label}</button>)}</nav>
      <div className="sidebar-rule" />
      <p className="section-label">INSTANCES</p>
      <div className="instance-list"><EmptySlot title="No instances yet" sub="Your instances will appear here" /></div>
      <button className="add-instance">＋ <span>Add instance</span></button>
      <div className="sidebar-spacer" />
      <button className="sidebar-link"><i>⇩</i>Downloads</button><button className="sidebar-link"><i>▤</i>Logs</button>
      <div className="profile"><div className="avatar">P</div><div><b>Parks</b><span><em /> Online</span></div><button>⚙</button></div>
    </aside>
    <main className="content">
      <header className="topbar"><div className="window-actions"><span>−</span><span>□</span><span>×</span></div></header>
      <section className="hero"><div><h1>Welcome back, <span>Parks</span></h1><p>Ready to play? Launch an instance or get started below.</p></div><div className="hero-card"><div className="hero-glow" /><div><b>Make something new</b><span>Create an instance to start playing</span></div><button>＋ Create</button></div></section>
      <div className="rule" />
      <section><h2>Quick Actions</h2><div className="quick-grid">{quickActions.map(([icon, title, desc, color]) => <button className="quick-card" key={title}><span className={'quick-icon ' + color}>{icon}</span><span><b>{title}</b><small>{desc}</small></span></button>)}</div></section>
      <div className="columns"><section className="recent"><div className="section-heading"><h2>Recent Instances</h2><button>View all <span>›</span></button></div>{[1,2,3,4].map(i => <EmptySlot key={i} />)}<button className="view-all">View all instances <span>›</span></button></section><section className="whats-new"><div className="section-heading"><h2>What's New</h2><button>View all <span>›</span></button></div>{[1,2,3].map(i => <EmptySlot key={i} title="Nothing new yet" sub="Updates and news will appear here" />)}</section></div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
