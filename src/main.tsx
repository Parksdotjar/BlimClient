import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Archive, ArrowDownToLine, ChevronRight, CirclePlus, Cuboid, Download, FolderOpen, Gamepad2, House, Layers3, List, PackageOpen, Puzzle, Settings, Sparkles, TerminalSquare, WandSparkles } from 'lucide-react';
import './styles.css';

const nav = [
  [House, 'Home'], [Puzzle, 'Mods'], [PackageOpen, 'Resource Packs'], [Layers3, 'Shaders'], [Settings, 'Settings'],
];
const quickActions = [
  [Puzzle, 'Browse Mods', 'Find and install mods\nfrom Modrinth', 'green'],
  [FolderOpen, 'Resource Packs', 'Browse and manage\nyour resource packs', 'gold'],
  [Cuboid, 'Shaders', 'Manage your\nshader packs', 'blue'],
  [Settings, 'Settings', 'Configure client\npreferences', 'slate'],
];

function EmptySlot({ title = 'Empty slot', sub = 'Create an instance to get started' }: { title?: string; sub?: string }) {
  return <div className="empty-slot"><span className="empty-plus">＋</span><div><strong>{title}</strong><p>{sub}</p></div></div>;
}

function App() {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/bloom-logo.png" alt="Bloom logo" /><div><b>Bloom Client</b><span>Minecraft Client</span></div></div>
      <button className="new-instance"><CirclePlus size={18} /> <span>New instance</span></button>
      <nav>{nav.map(([Icon, label], index) => <button className={index === 0 ? 'active' : ''} key={label as string}><Icon size={17} strokeWidth={2} />{label as string}</button>)}</nav>
      <div className="sidebar-rule" />
      <p className="section-label">INSTANCES</p>
      <div className="instance-list"><EmptySlot title="No instances yet" sub="Your instances will appear here" /></div>
      <button className="add-instance"><CirclePlus size={16} /> <span>Add instance</span></button>
      <div className="sidebar-spacer" />
      <button className="sidebar-link"><Download size={17} />Downloads</button><button className="sidebar-link"><TerminalSquare size={17} />Logs</button>
      <div className="profile"><div className="avatar">P</div><div><b>Parks</b><span><em /> Online</span></div><button><Settings size={16} /></button></div>
    </aside>
    <main className="content">
      <header className="topbar" />
      <section className="hero"><div><h1>Welcome back, <span>Parks</span></h1><p>Ready to play? Launch an instance or get started below.</p></div><div className="hero-card"><div className="hero-glow" /><div><b>Make something new</b><span>Create an instance to start playing</span></div><button>＋ Create</button></div></section>
      <div className="rule" />
      <section><h2>Quick Actions</h2><div className="quick-grid">{quickActions.map(([Icon, title, desc, color]) => <button className="quick-card" key={title as string}><span className={'quick-icon ' + color}><Icon size={25} strokeWidth={1.8} /></span><span><b>{title as string}</b><small>{desc as string}</small></span></button>)}</div></section>
      <div className="columns"><section className="recent"><div className="section-heading"><h2>Recent Instances</h2><button>View all <ChevronRight size={15} /></button></div>{[1,2,3,4].map(i => <EmptySlot key={i} />)}<button className="view-all">View all instances <ChevronRight size={16} /></button></section><section className="whats-new"><div className="section-heading"><h2>What's New</h2><button>View all <ChevronRight size={15} /></button></div>{[1,2,3].map(i => <EmptySlot key={i} title="Nothing new yet" sub="Updates and news will appear here" />)}</section></div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
