import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import {
  MessageSquare,
  User,
  Compass,
  PlusCircle,
  Library,
  Settings,
  Star,
  Zap,
  MoreHorizontal,
  Send,
  RefreshCw,
  Edit3,
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  MoreVertical,
  X,
  Check,
  Sparkles,
  Brain,
  Pencil,
  FileText,
  UserPlus,
  Volume2,
  ChevronLeftCircle,
  ChevronRightCircle,
  Dices,
  History,
  Info,
  Layers,
  Download,
  ArrowLeft,
  ArrowRight,
  Plus,
  Wand2,
  Copy,
  Ghost,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
  Share2
} from "lucide-react";

// Import character data and type
import { Character, MOCK_CHARACTERS, MaturityLevel } from "./characters";

// --- Types & Interfaces ---

interface UserProfile {
  name: string;
  handle: string;
  avatarInitial: string;
}

interface Persona {
  id: string;
  name: string;
  bio: string;
  traits: string[];
  isPrivate: boolean;
  avatarColor: string;
  greeting?: string;
}

interface Message {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  personaId?: string; 
  timestamp: number;
  versions?: string[];
  currentVersionIndex?: number;
  isGenerating?: boolean;
  isHidden?: boolean;
}

interface ChatSession {
  id: string;
  characterId: string;
  messages: Message[];
  lastActive: number;
}

// --- Utilities ---

const generateId = (prefix: string = "") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const vibrate = (ms: number = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
};

const getHexFromBgClass = (bgClass: string): string => {
  const colorMap: Record<string, string> = {
    "bg-red-600": "#dc2626",
    "bg-orange-600": "#ea580c",
    "bg-amber-600": "#d97706",
    "bg-yellow-600": "#ca8a04",
    "bg-lime-600": "#65a30d",
    "bg-green-600": "#16a34a",
    "bg-emerald-600": "#059669",
    "bg-teal-600": "#0d9488",
    "bg-cyan-600": "#0891b2",
    "bg-sky-600": "#0284c7",
    "bg-blue-600": "#2563eb",
    "bg-indigo-600": "#4f46e5",
    "bg-violet-600": "#7c3aed",
    "bg-purple-600": "#9333ea",
    "bg-fuchsia-600": "#c026d3",
    "bg-pink-600": "#db2777",
    "bg-rose-600": "#e11d48",
    "bg-slate-700": "#334155",
    "bg-stone-700": "#44403c",
    "bg-stone-600": "#57534e",
    "bg-zinc-800": "#27272a",
    "bg-slate-800": "#1e293b"
  };
  return colorMap[bgClass] || "#3b82f6";
};

// Replace {{user}} with persona name
const replaceUserPlaceholder = (text: string | undefined, personaName: string) => {
  if (!text) return "";
  return text.replace(/\{\{user\}\}/gi, personaName);
};

// Formats text with asterisks into styled spans, hiding the asterisks
const renderFormattedText = (text: string) => {
  // Regex to match **bold** or *italic/action*
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <span key={i} className="italic text-slate-400 opacity-90">{part.slice(1, -1)}</span>;
    }
    return part;
  });
};

const handleShareApp = async (setToast: (m: string) => void) => {
  const shareData = {
    title: 'Moonai',
    text: 'Check out Moonai for unrestricted character roleplay and deep AI conversations!',
    url: window.location.origin
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setToast("App Link Copied");
    }
  } catch (err) {
    console.error('Error sharing:', err);
  }
};

const handleDownloadChat = (character: Character, session: ChatSession, persona: Persona) => {
  let content = `Moonai Export: ${character.name}\n`;
  content += `Persona: ${persona.name}\n`;
  content += `Timestamp: ${new Date().toLocaleString()}\n`;
  content += `------------------------------------------\n\n`;

  if (character.greeting) {
    content += `${character.name}: ${replaceUserPlaceholder(character.greeting, persona.name)}\n\n`;
  }

  session.messages.forEach(msg => {
    if (msg.role === 'system') {
      content += `[SYSTEM]: ${msg.text}\n\n`;
    } else {
      const name = msg.role === 'user' ? persona.name : character.name;
      content += `${name}: ${msg.text}\n\n`;
    }
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Moonai_Chat_${character.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Components ---

const AbstractAvatar = ({ 
  name, 
  colorClass, 
  size = "md", 
  initial, 
  seed = 0,
  className = "" 
}: { 
  name: string, 
  colorClass: string, 
  size?: "xs" | "sm" | "md" | "lg" | "xl", 
  initial: string,
  seed?: number,
  className?: string
}) => {
  const baseHash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0) * 13, 0);
  const hash = baseHash + (seed * 157);
  const dim = { xs: 24, sm: 30, md: 40, lg: 56, xl: 72 }[size];
  const shapes = [];
  for (let i = 0; i < 5; i++) {
    const s = hash * (i + 1);
    const cx = (s % 100);
    const cy = ((s >> 2) % 100);
    const r = 15 + (s % 35);
    const rotate = (s % 360);
    const opacity = 0.1 + (i * 0.08);
    if (i % 2 === 0) {
      shapes.push(<circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={`${r}%`} fill="white" fillOpacity={opacity} />);
    } else {
      shapes.push(<rect key={i} x={`${cx - r/2}%`} y={`${cy - r/2}%`} width={`${r}%`} height={`${r}%`} fill="white" fillOpacity={opacity} transform={`rotate(${rotate} ${cx} ${cy})`} />);
    }
  }
  return (
    <div className={`relative ${colorClass} rounded-full overflow-hidden flex items-center justify-center shadow-lg ring-1 ring-white/10 flex-none ${className}`} style={{ width: dim, height: dim }}>
      <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`grad-${hash}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grad-${hash})`} />
        {shapes}
      </svg>
      <span className="relative z-10 font-black text-white drop-shadow-lg select-none uppercase" style={{ fontSize: dim * 0.45 }}>{initial}</span>
    </div>
  );
};

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "p_default",
    name: "Standard Me",
    bio: "Just myself, living in the real world.",
    traits: ["Human", "Authentic"],
    isPrivate: true,
    avatarColor: "bg-blue-500",
    greeting: "Hello! It's just me today."
  }
];

const CharacterCard: React.FC<{ 
  character: Character, 
  onStartChat: (id: string) => void, 
  onCustomize: (id: string) => void 
}> = ({ character, onStartChat, onCustomize }) => (
  <div className="bg-[#1a1a1a] rounded-3xl p-3 shadow-xl border border-white/5 flex flex-col gap-2 hover:border-primary/40 transition-all group active:scale-[0.98]">
    <div className="flex items-start justify-between">
      <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="md" initial={character.initial} />
      <div className="flex items-center gap-1.5">
        <button 
          onClick={(e) => { e.stopPropagation(); onCustomize(character.id); }} 
          className="p-2.5 bg-white/5 text-primary hover:bg-primary/20 hover:text-white rounded-full transition-all flex items-center justify-center ring-1 ring-white/10" 
          title="Edit Character"
        >
          <Pencil size={14} strokeWidth={3} />
        </button>
        <button 
          onClick={() => onStartChat(character.id)} 
          className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Chat
        </button>
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <h3 className="font-black text-base text-white group-hover:text-primary transition-colors truncate">{character.name}</h3>
        {character.maturityLevel === 'unrestricted' && <span className="text-[7px] font-black bg-purple-600/30 text-purple-200 px-1 py-0.5 rounded border border-purple-500/30 flex-none">X</span>}
      </div>
      {character.subtitle && <p className="text-primary/70 text-[9px] font-black uppercase tracking-widest mb-0.5 italic truncate">{character.subtitle}</p>}
      <p className="text-slate-400 text-[11px] line-clamp-2 font-medium leading-tight">{character.tagline}</p>
    </div>
    <div className="flex items-center text-[8px] text-slate-500 mt-auto pt-2 border-t border-white/5 uppercase font-bold tracking-widest">
      <span className="text-slate-400 truncate max-w-[60px]">{character.creator}</span>
      <span className="mx-1.5 opacity-30">•</span>
      <span className="truncate">{character.engagement}</span>
    </div>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState<string>("for_you");
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('pf_characters');
    return saved ? JSON.parse(saved) : MOCK_CHARACTERS;
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pf_user_profile');
    return saved ? JSON.parse(saved) : { name: "User Zero", handle: "@zero", avatarInitial: "0" };
  });
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const saved = localStorage.getItem('pf_personas');
    return saved ? JSON.parse(saved) : DEFAULT_PERSONAS;
  });
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('pf_chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [appToast, setAppToast] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string>("p_default");
  const [createViewMode, setCreateViewMode] = useState<"character" | "persona">("character");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('pf_characters', JSON.stringify(characters)); }, [characters]);
  useEffect(() => { localStorage.setItem('pf_personas', JSON.stringify(personas)); }, [personas]);
  useEffect(() => { localStorage.setItem('pf_chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem('pf_user_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { if (appToast) { const timer = setTimeout(() => setAppToast(null), 2500); return () => clearTimeout(timer); } }, [appToast]);
  
  const startChat = (charId: string) => {
    vibrate();
    const existing = chats.find(c => c.characterId === charId);
    if (existing) {
      setActiveChatId(existing.id);
    } else {
      const newChat: ChatSession = {
        id: generateId("chat_"),
        characterId: charId,
        messages: [], 
        lastActive: Date.now()
      };
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
    }
  };

  const clearAllData = () => {
    if (confirm("Are you sure? This will reset everything.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const renderTabContent = () => {
    if (activeChatId) {
      const session = chats.find(c => c.id === activeChatId);
      const character = characters.find(c => c.id === session?.characterId);
      if (session && character) {
        return (
          <ChatInterface 
            session={session} 
            character={character} 
            personas={personas}
            userProfile={userProfile}
            setAppToast={setAppToast}
            activePersonaId={activePersonaId}
            setActivePersonaId={(id: string) => {
               setActivePersonaId(id);
               const targetPersona = personas.find(p => p.id === id);
               if (targetPersona) {
                 const systemMsg: Message = { id: generateId("sys_"), role: "system", text: `Persona Shift: You are now interacting with ${targetPersona.name}.`, timestamp: Date.now() };
                 setChats(prev => prev.map(c => c.id === session.id ? { ...c, messages: [...c.messages, systemMsg] } : c));
               }
            }}
            onBack={() => setActiveChatId(null)}
            onUpdateSession={(updatedSession: ChatSession | ((prev: ChatSession) => ChatSession)) => { 
              if (typeof updatedSession === 'function') {
                setChats(prev => prev.map(c => c.id === session.id ? updatedSession(c) : c));
              } else {
                setChats(prev => prev.map(c => c.id === updatedSession.id ? updatedSession : c)); 
              }
            }}
            onUpdateCharacter={(updates: Partial<Character>) => { setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, ...updates } : c)); }}
            onDeleteChat={(id: string) => { setChats(prev => prev.filter(c => c.id !== id)); setActiveChatId(null); }}
            onCreatePersona={() => { setCreateViewMode("persona"); setActiveChatId(null); setActiveTab("create"); }}
          />
        );
      }
      setActiveChatId(null); 
    }
    
    if (editingCharacterId) {
       const char = characters.find(c => c.id === editingCharacterId);
       if (char) {
         return <CharacterEditor 
           mode="edit" 
           initialData={char} 
           userProfile={userProfile} 
           onSave={(data) => {
             setCharacters(prev => prev.map(c => c.id === editingCharacterId ? { ...c, ...data, creator: userProfile.handle } : c));
             setEditingCharacterId(null);
             setAppToast("Manifestation Anchored");
           }} 
           onCancel={() => setEditingCharacterId(null)} 
           personas={personas}
           activePersonaId={activePersonaId}
         />;
       }
    }

    switch (activeTab) {
      case "for_you": return <ForYouView characters={characters} onStartChat={startChat} onCustomize={setEditingCharacterId} />;
      case "featured": return <FeaturedView characters={characters} onStartChat={startChat} onCustomize={setEditingCharacterId} />;
      case "explore": return <ExploreView characters={characters} onStartChat={startChat} onCustomize={setEditingCharacterId} />;
      case "chat": return <ChatListView chats={chats} characters={characters} onOpenChat={setActiveChatId} onDeleteChat={(id: string) => setChats(chats.filter(c => c.id !== id))} />;
      case "create": return <CreateView initialMode={createViewMode} userProfile={userProfile} onAddCharacters={(newChars: Character[]) => setCharacters([...newChars, ...characters])} onCreateCharacter={(c: any) => { setCharacters([c, ...characters]); setAppToast("Identity Manifested"); setActiveTab("library"); }} onCreatePersona={(p: any) => { setPersonas([p, ...personas]); setAppToast("Persona Formed"); setActiveTab("profile"); }} onBack={() => setActiveTab('for_you')} />;
      case "library": return <LibraryView characters={characters} personas={personas} userProfile={userProfile} onEditCharacter={(c: Character) => setEditingCharacterId(c.id)} />;
      case "profile": return <ProfileView personas={personas} activePersonaId={activePersonaId} setActivePersonaId={(id: string) => { setActivePersonaId(id); const p = personas.find(pers => pers.id === id); if (p) setAppToast(`Manifested: ${p.name}`); }} chats={chats} updatePersona={(p: Persona) => setPersonas(prev => prev.map(o => o.id === p.id ? p : o))} userProfile={userProfile} setUserProfile={setUserProfile} onDeletePersona={(id: string) => setPersonas(personas.filter(p => p.id !== id))} />;
      case "settings": return <SettingsView onClearData={clearAllData} userProfile={userProfile} setAppToast={setAppToast} />;
      default: return <ForYouView characters={characters} onStartChat={startChat} onCustomize={setEditingCharacterId} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#121212] text-[#e0e0e0] font-sans overflow-hidden">
      {!activeChatId && !editingCharacterId && (
        <div className="h-14 flex-none border-b border-white/5 bg-[#121212]/80 backdrop-blur-xl z-50">
          <div className="max-w-screen-xl mx-auto h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">M</div>
               <h1 className="text-lg font-black tracking-tighter uppercase text-white">Moonai</h1>
            </div>
            <button className="p-2 text-slate-500 hover:text-white transition-colors"><Search size={18} /></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className={`h-full ${!activeChatId && !editingCharacterId ? 'max-w-screen-xl mx-auto' : ''}`}>
          {renderTabContent()}
        </div>
      </div>
      
      {appToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 animate-in slide-in-from-top-4 duration-300">
          <Check size={12} /> {appToast}
        </div>
      )}
      
      {!activeChatId && !editingCharacterId && (
        <div className="h-16 flex-none bg-[#1a1a1a]/90 backdrop-blur-md border-t border-white/5 z-50">
          <div className="max-w-screen-xl mx-auto h-full flex items-center justify-center">
            <div className="flex items-center h-full overflow-x-auto no-scrollbar px-4 space-x-0.5 md:space-x-4">
              <NavItem id="for_you" label="For You" icon={Sparkles} active={activeTab} set={handleNav} />
              <NavItem id="featured" label="Featured" icon={Star} active={activeTab} set={handleNav} />
              <NavItem id="explore" label="Explore" icon={Compass} active={activeTab} set={handleNav} />
              <NavItem id="chat" label="Chat" icon={MessageSquare} active={activeTab} set={handleNav} />
              <NavItem id="create" label="Create" icon={PlusCircle} active={activeTab} set={handleNav} />
              <NavItem id="library" label="Library" icon={Library} active={activeTab} set={handleNav} />
              <NavItem id="profile" label="Profile" icon={User} active={activeTab} set={handleNav} />
              <NavItem id="settings" label="Settings" icon={Settings} active={activeTab} set={handleNav} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
  function handleNav(id: string) { vibrate(5); if (id === 'create') setCreateViewMode('character'); setActiveTab(id); }
};

const NavItem = ({ id, label, icon: Icon, active, set }: any) => (
  <button onClick={() => set(id)} className={`flex flex-col items-center justify-center min-w-[64px] h-14 rounded-xl transition-all duration-200 ${active === id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
    <Icon size={18} strokeWidth={active === id ? 3 : 2} className={active === id ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : ""} />
    <span className="text-[8px] font-bold mt-0.5 uppercase tracking-tighter">{label}</span>
  </button>
);

const ForYouView = ({ characters, onStartChat, onCustomize }: any) => (
  <div className="p-4 pb-20 space-y-6">
    <header className="mt-2 mb-1">
      <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-white to-blue-300 tracking-tighter">Neural Harvest</h1>
      <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1 opacity-60 italic">Displaying top manifestations</p>
    </header>
    <section>
      <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-1.5"><Zap size={12} className="fill-primary" /> Daily Cluster</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {characters.slice(0, 100).map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} onCustomize={onCustomize} />)}
      </div>
    </section>
  </div>
);

const FeaturedView = ({ characters, onStartChat, onCustomize }: any) => (
  <div className="p-4 pb-20">
    <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter text-white">Verified Archetypes</h1>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {characters.slice(0, 100).map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} onCustomize={onCustomize} />)}
    </div>
  </div>
);

const ExploreView = ({ characters, onStartChat, onCustomize }: any) => {
  const [search, setSearch] = useState("");
  const filtered = characters.filter((c: Character) => (search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))));
  return (
    <div className="p-4 pb-20">
      <div className="relative mb-6 max-w-2xl mx-auto">
        <Search className="absolute left-3.5 top-3.5 text-slate-600" size={16} />
        <input type="text" placeholder="Search identities..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white text-sm font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-600 shadow-inner" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.slice(0, 100).map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} onCustomize={onCustomize} />)}
      </div>
    </div>
  );
};

const ChatListView = ({ chats, characters, onOpenChat, onDeleteChat }: any) => {
  if (chats.length === 0) return <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-20"><MessageSquare size={48} className="mb-4" /><h3 className="text-lg font-black uppercase tracking-widest">Silence</h3></div>;
  return (
    <div className="max-w-3xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter text-white">Dialogues</h1>
      <div className="space-y-2">
        {chats.map((chat: ChatSession) => {
          const char = characters.find((c: any) => c.id === chat.characterId);
          if (!char) return null;
          const lastMsg = chat.messages.filter(m => !m.isHidden).pop();
          return (
            <div key={chat.id} className="group relative flex items-center gap-1.5">
              <button onClick={() => onOpenChat(chat.id)} className="flex-1 bg-[#1a1a1a]/40 p-3 rounded-2xl flex items-center gap-3 hover:bg-[#1a1a1a] transition-all border border-transparent hover:border-white/5 text-left active:scale-[0.98]">
                <AbstractAvatar name={char.name} colorClass={char.color} seed={char.seed} size="md" initial={char.initial} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5"><h3 className="font-black text-base truncate text-white">{char.name}</h3><span className="text-[8px] font-black text-slate-500 uppercase">{new Date(chat.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                  <p className="text-[11px] text-slate-500 truncate font-medium">{lastMsg ? (lastMsg.role === 'user' ? 'You: ' : '') + lastMsg.text : "Awaiting word..."}</p>
                </div>
              </button>
              <button onClick={() => onDeleteChat(chat.id)} className="p-2 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CreateView = ({ onCreateCharacter, onCreatePersona, onBack, initialMode, userProfile, onAddCharacters }: any) => {
  const [mode, setMode] = useState<"character" | "persona" | "generate">(initialMode || "character");
  const [personaName, setPersonaName] = useState("");
  const [personaBio, setPersonaBio] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const neuralHarvest = async () => {
    vibrate(25);
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate 100 extremely diverse and unique character profiles for a chat app. Return them strictly as a JSON array of objects with these fields: name, tagline, subtitle, description, greeting, systemInstruction, color (Tailwind bg- color), maturityLevel (everyone, teen, mature, unrestricted), and tags (array). Ensure characters are high-quality and cinematic.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                tagline: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                description: { type: Type.STRING },
                greeting: { type: Type.STRING },
                systemInstruction: { type: Type.STRING },
                color: { type: Type.STRING },
                maturityLevel: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "tagline", "subtitle", "description", "greeting", "systemInstruction", "color", "maturityLevel", "tags"]
            }
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      const data = JSON.parse(response.text || "[]");
      const mapped = data.map((c: any) => ({
        id: generateId("gen_"),
        creator: "@AI_Neural",
        engagement: "New",
        initial: c.name[0],
        seed: Math.floor(Math.random() * 1000),
        ...c
      }));
      onAddCharacters(mapped);
      onBack();
    } catch (e) {
      console.error(e);
      alert("Neural Harvest interrupted. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] animate-in fade-in duration-300">
      <div className="px-4 pt-4 mb-3 flex items-center justify-between max-w-screen-xl mx-auto w-full">
        <h1 className="text-xl font-black uppercase tracking-tighter">Laboratory</h1>
        <button onClick={onBack} className="p-2 text-slate-600 hover:text-white"><X size={18}/></button>
      </div>

      <div className="flex bg-[#1a1a1a] p-1 rounded-xl mx-4 mb-6 border border-white/10 shadow-inner max-w-lg md:mx-auto md:w-full">
        <button onClick={() => setMode("character")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'character' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Character</button>
        <button onClick={() => setMode("persona")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'persona' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Persona</button>
        <button onClick={() => setMode("generate")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'generate' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500'}`}>Harvest</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {mode === 'character' ? (
          <CharacterEditor personas={[]} activePersonaId="" mode="create" userProfile={userProfile} initialData={{ creator: userProfile.handle }} onCancel={onBack} onSave={(data: any) => onCreateCharacter({ id: generateId("char_"), initial: data.name![0].toUpperCase(), color: 'bg-indigo-600', creator: userProfile.handle, engagement: "0", tags: [], ...data })} />
        ) : mode === 'persona' ? (
          <div className="px-4 pb-20 space-y-4 max-w-lg mx-auto w-full">
            <div className="space-y-1.5">
               <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Persona Name</label>
               <input value={personaName} onChange={e => setPersonaName(e.target.value)} placeholder="Identify yourself..." className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50 transition-all" />
            </div>
            <div className="space-y-1.5">
               <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Manifest Memory</label>
               <textarea value={personaBio} onChange={e => setPersonaBio(e.target.value)} placeholder="Describe your essence in this dialogue..." className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-sm text-white h-32 outline-none resize-none focus:border-primary/50 transition-all" />
            </div>
            <button onClick={() => { vibrate(); onCreatePersona({ id: generateId("p_"), name: personaName, bio: personaBio, traits: [], isPrivate: true, avatarColor: "bg-blue-600" }); onBack(); }} disabled={!personaName.trim()} className="w-full bg-primary text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95">Anchor Persona</button>
          </div>
        ) : (
          <div className="px-4 text-center space-y-6 pt-10 pb-20 max-w-xl mx-auto">
            <div className="w-20 h-20 bg-purple-600/20 text-purple-500 rounded-full flex items-center justify-center mx-auto animate-pulse"><Layers size={40}/></div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Neural Harvest</h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">Summon 100 diverse AI-generated identities at once. This protocol uses massive processing power to populate your multiverse library.</p>
            </div>
            <button onClick={neuralHarvest} disabled={isGenerating} className="w-full max-w-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-5 rounded-[2rem] uppercase tracking-widest text-xs shadow-xl shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto">
              {isGenerating ? <RefreshCw className="animate-spin" /> : <Download size={18} />}
              {isGenerating ? "Manifesting 100 Entities..." : "Commence Harvest"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CharacterEditor = ({ initialData, onSave, onCancel, mode, userProfile, personas, activePersonaId }: { initialData: Partial<Character>, onSave: (data: Partial<Character>) => void, onCancel: () => void, mode: "create" | "edit", userProfile: UserProfile, personas: Persona[], activePersonaId: string }) => {
  const [name, setName] = useState(initialData.name || "");
  const [tagline, setTagline] = useState(initialData.tagline || "");
  const [subtitle, setSubtitle] = useState(initialData.subtitle || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [greeting, setGreeting] = useState(initialData.greeting || "");
  const [systemInstruction, setSystemInstruction] = useState(initialData.systemInstruction || "");
  const [visibility, setVisibility] = useState<"public" | "private">(initialData.visibility || "public");
  const [seed, setSeed] = useState(initialData.seed || Math.floor(Math.random() * 1000));
  const [color, setColor] = useState(initialData.color || "bg-blue-600");
  const [isGeneratingGreeting, setIsGeneratingGreeting] = useState(false);
  const [showGreetingTips, setShowGreetingTips] = useState(false);
  
  const isDefaultChar = initialData.creator !== userProfile.handle && mode === 'edit';
  const THEME_COLORS = ["bg-red-600", "bg-orange-600", "bg-amber-600", "bg-yellow-600", "bg-lime-600", "bg-green-600", "bg-emerald-600", "bg-teal-600", "bg-cyan-600", "bg-sky-600", "bg-blue-600", "bg-indigo-600", "bg-violet-600", "bg-purple-600", "bg-fuchsia-600", "bg-pink-600", "bg-rose-600", "bg-slate-700", "bg-stone-700", "bg-zinc-800"];

  const generateGreetingArchitect = async (vibe: string) => {
    if (!name || isGeneratingGreeting) return;
    vibrate(25);
    setIsGeneratingGreeting(true);
    try {
      const activePersona = personas.find(p => p.id === activePersonaId);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Craft a cinematic, immersive opening greeting for a character named ${name}. 
      Vibe: ${vibe}. 
      Identity: ${tagline}. 
      Context: This greeting is directed at a user persona named {{user}} (${activePersona?.bio || "unspecified identity"}).
      Directives: ${systemInstruction}.
      
      Requirements:
      - Use first-person dialogue.
      - Describe actions in *asterisks*.
      - Use {{user}} to refer to the person the character is talking to.
      - Return ONLY the greeting text with {{user}} included.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { temperature: 1.0, thinkingConfig: { thinkingBudget: 0 } }
      });
      setGreeting(response.text || "");
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingGreeting(false);
      setShowGreetingTips(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
      {/* HEADER: STYLED LIKE CHARACTER AI */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#121212] sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-white/5 rounded-full transition-all active:scale-90"><ChevronLeft size={24} /></button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">{mode === 'create' ? 'Creating' : 'Editing'}</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">{name || "New Character"}</h2>
            </div>
          </div>
          <button 
            onClick={() => { vibrate(); onSave({ name, tagline, subtitle, description, greeting, systemInstruction, visibility, seed, color }); }} 
            className="bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-[0.15em] px-6 py-2.5 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check size={16} strokeWidth={3} />
            {isDefaultChar ? 'Save as Own' : 'Save'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA: TWO-COLUMN (PC) / STACKED (MOBILE) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-[#0a0a0a]">
        <div className="max-w-screen-xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: IDENTITY & AVATAR */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20"></div>
              <div className="relative">
                <AbstractAvatar name={name || "?"} colorClass={color} size="xl" initial={name ? name[0] : "?"} seed={seed} className="ring-4 ring-[#1a1a1a]" />
                {/* DICE OVERLAY - Functional randomness */}
                <button 
                  onClick={() => { 
                    vibrate(15); 
                    const newSeed = Math.floor(Math.random() * 10000);
                    const randomColor = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
                    setSeed(newSeed);
                    setColor(randomColor);
                  }} 
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-3 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:bg-primary/90 hover:scale-110 transition-all active:scale-90 border-4 border-[#121212] z-10 group"
                  title="Randomize Avatar Manifestation"
                >
                  <Dices size={20} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>
              <div className="w-full space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Tony Stark, Batman..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Short Tagline</label>
                  <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Genius, Billionaire, Playboy..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-sm text-white font-medium outline-none focus:border-primary/50 transition-all" />
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {THEME_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border border-white/10 transition-all ${c} ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#121212] scale-110' : 'hover:scale-110 opacity-40 hover:opacity-100'}`} />)}
                </div>
              </div>
            </div>

            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-6 space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings size={14}/> Settings</h3>
               <div className="space-y-3">
                  <button 
                    onClick={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${visibility === 'public' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-[#1a1a1a] border-white/5 text-slate-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      {visibility === 'public' ? <Eye size={18} /> : <EyeOff size={18} />}
                      <span className="text-xs font-bold uppercase tracking-widest">Visibility: {visibility}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-all ${visibility === 'public' ? 'bg-primary' : 'bg-slate-700'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${visibility === 'public' ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </button>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CORE PROTOCOLS (GREETING, DESCRIPTION, DEFINITION) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* GREETING SECTION */}
            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tighter flex items-center gap-2"><MessageSquare size={18} className="text-primary"/> Greeting</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">How the conversation starts</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowGreetingTips(!showGreetingTips)}
                    className={`flex items-center gap-2 text-[9px] font-black uppercase px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all ${isGeneratingGreeting ? 'animate-pulse text-purple-400 border-purple-400/30' : 'text-primary'}`}
                  >
                    <Wand2 size={14} /> AI Architect
                  </button>
                  {showGreetingTips && (
                    <div className="absolute top-11 right-0 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-3xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="p-3 border-b border-white/5 bg-white/5 text-[8px] font-black text-slate-500 uppercase tracking-[0.1em]">Select Creative Vibe</div>
                      {["Action Packed", "Slow Burn", "Mysterious", "Aggressive", "Warm & Welcoming"].map(v => (
                        <button key={v} onClick={() => generateGreetingArchitect(v)} className="w-full text-left px-4 py-3 hover:bg-primary/10 hover:text-primary text-[11px] text-white font-bold border-b border-white/5 last:border-0 transition-all">{v}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <textarea 
                  value={greeting} 
                  onChange={e => setGreeting(e.target.value)} 
                  placeholder="Example: *Tony Stark leans back in his chair, swirling a glass of scotch.* 'So, you finally decided to show up? I was starting to think the world didn't need saving today.' {{user}}..." 
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 text-sm text-white h-56 outline-none resize-none focus:border-primary/50 transition-all font-medium leading-relaxed placeholder:text-slate-700" 
                />
                {isGeneratingGreeting && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-primary" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Architecting...</span>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2.5 px-2 py-3 bg-blue-600/5 rounded-2xl border border-blue-600/10">
                <AlertCircle size={16} className="text-primary flex-none mt-0.5" />
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Pro-tip: Use <span className="text-primary font-black">{"{{user}}"}</span> to refer to the user.
                </p>
              </div>
            </div>

            {/* NEURAL DESCRIPTION SECTION (Long Description) */}
            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tighter flex items-center gap-2"><BookOpen size={18} className="text-amber-500"/> Neural Description</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Detailed backstory, appearance, and context</p>
              </div>
              <div className="space-y-1.5">
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Write a long-form prose description of who this character is, their history, and what they look like. This helps the AI understand the 'soul' of the entity." 
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 text-[13px] text-white h-56 outline-none resize-none focus:border-primary/50 transition-all leading-relaxed placeholder:text-slate-700 font-medium" 
                />
              </div>
            </div>

            {/* NEURAL DEFINITION SECTION (Advanced Logic) */}
            <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tighter flex items-center gap-2"><Brain size={18} className="text-purple-500"/> Neural Definition</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Example dialogues, speech patterns, and deep-seated motivations</p>
              </div>
              <div className="space-y-1.5">
                <textarea 
                  value={systemInstruction} 
                  onChange={e => setSystemInstruction(e.target.value)} 
                  placeholder="Describe speech patterns, example dialogues, and technical behavioral logic.
Tony Stark: 'I told you, I don't want to join your boy band.'
{{user}}: 'It's not a band, Tony.'..." 
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 text-[13px] text-white h-72 outline-none font-mono resize-none focus:border-primary/50 transition-all leading-relaxed placeholder:text-slate-700" 
                />
              </div>
              <div className="flex items-start gap-2.5 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Advanced parameters for expert-level character crafting.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const LibraryView = ({ characters, userProfile, onEditCharacter }: any) => (
  <div className="p-4 pb-20">
    <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter">Identity Archive</h1>
    <div className="space-y-8">
      <section>
        <h2 className="text-[9px] font-black text-slate-600 uppercase mb-3 tracking-widest flex items-center gap-1.5 px-1">Manifested Entities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {characters.map((c: any) => (
            <div key={c.id} className="bg-[#1a1a1a] p-3 rounded-2xl flex items-center justify-between group border border-white/5 hover:border-white/20 transition-all shadow-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <AbstractAvatar name={c.name} colorClass={c.color} seed={c.seed} size="sm" initial={c.initial}/>
                <div className="overflow-hidden">
                  <div className="font-bold text-sm text-white leading-tight truncate">{c.name}</div>
                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest truncate">{c.creator === userProfile.handle ? "Your Creation" : c.creator}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
                <button onClick={() => onEditCharacter(c)} className="p-2 text-primary hover:text-white transition-colors" title="Customize Core"><Pencil size={18} strokeWidth={3} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const ProfileView = ({ personas, activePersonaId, setActivePersonaId, userProfile, setUserProfile, onDeletePersona, updatePersona }: any) => {
  return (
    <div className="p-4 max-w-lg mx-auto w-full pb-24">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-primary rounded-[1.8rem] flex items-center justify-center text-3xl font-black mb-3 shadow-2xl shadow-primary/30">{userProfile.avatarInitial}</div>
        <h1 className="text-2xl font-black tracking-tighter text-white">{userProfile.name}</h1>
        <div className="text-slate-600 font-bold uppercase tracking-widest text-[9px] mt-0.5">{userProfile.handle}</div>
      </div>
      <div className="space-y-3">
        {personas.map((p: any) => (
          <button key={p.id} onClick={() => setActivePersonaId(p.id)} className={`w-full p-4 rounded-[1.8rem] text-left transition-all border-2 relative overflow-hidden ${activePersonaId === p.id ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-[#1a1a1a] border-white/5 text-slate-500 hover:border-white/10'}`}>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-black text-base leading-tight">{p.name}</div>
                <div className="text-[10px] opacity-60 truncate leading-relaxed mt-0.5">{p.bio}</div>
              </div>
              {activePersonaId === p.id && <Check size={16} className="text-white" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const SettingsView = ({ onClearData, userProfile, setAppToast }: any) => (
  <div className="p-4 max-w-lg mx-auto w-full pb-24">
    <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter text-white">Core Settings</h1>
    <div className="bg-[#1a1a1a] rounded-[2.5rem] overflow-hidden border border-white/5 p-6 space-y-6 shadow-2xl">
      <section className="space-y-4">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Interface</h3>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <span className="text-xs font-black uppercase tracking-widest text-slate-300">Tactile Haptics</span>
          <button className="w-10 h-5 bg-primary rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Social</h3>
        <button 
          onClick={() => { vibrate(); handleShareApp(setAppToast); }}
          className="w-full flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl border border-primary/20 transition-all active:scale-95"
        >
          <div className="flex items-center gap-3">
            <Share2 size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Spread Moonai</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </section>
      
      <section className="pt-4 border-t border-white/5">
        <button onClick={onClearData} className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Emergency Purge</button>
      </section>
    </div>
  </div>
);

const ChatInterface = ({ session, character, personas, activePersonaId, setActivePersonaId, onBack, onUpdateSession, onUpdateCharacter, userProfile, setAppToast }: any) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showPersonaShift, setShowPersonaShift] = useState(false);

  const characterHex = useMemo(() => getHexFromBgClass(character.color), [character.color]);
  const currentPersona = useMemo(() => personas.find((p: Persona) => p.id === activePersonaId) || personas[0], [personas, activePersonaId]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [session.messages, loading]);

  const getEnhancedSystemPrompt = (char: Character, persona: Persona) => {
    return `IDENTITY: ${char.name} (${char.tagline})
${char.description ? `LONG DESCRIPTION:\n${char.description}` : ""}
${char.memory ? `PERMANENT MEMORY:\n${char.memory}` : ""}
CORE DIRECTIVES / DEFINITION:
${replaceUserPlaceholder(char.systemInstruction, persona.name)}

CONTEXT: You are talking to ${persona.name}. Characterized as: ${persona.bio}.
IMPORTANT: You MUST maintain the continuity of the conversation. You said the following greeting to start: 
"${replaceUserPlaceholder(char.greeting, persona.name)}"

STRICT ROLEPLAY RULES:
- IMPORTANT: Refer to the user as ${persona.name} (never generic).
- Actions in asterisks (*).
- Dialogue prefixed with '${char.name}: '.
- MINIMAL LATENCY MODE: Keep responses cinematic, evocative, but concise.
- UNRESTRICTED: Embrace high-fidelity, visceral descriptions.
- CONSISTENCY: Never forget who you are or what happened previously in this dialogue.`;
  };

  /**
   * Robust history formatter for Gemini API.
   * Ensures history is alternating correctly and merged where necessary.
   */
  const formatHistoryForGemini = (messages: Message[], charGreeting?: string, personaName?: string) => {
    const history = [];
    
    // Optional: Start with the greeting if it's the first turn, but Gemini requires starting with 'user'.
    // We handle the greeting in the system prompt for better stability.

    let lastRole: "user" | "model" | null = null;

    for (const msg of messages) {
      if (msg.role === 'system' || msg.isGenerating || msg.isHidden) continue;
      
      const role = msg.role as 'user' | 'model';
      
      if (role === lastRole) {
        // Combine consecutive turns of the same role to maintain API strictness
        const lastContent = history[history.length - 1];
        lastContent.parts[0].text += "\n\n" + msg.text;
      } else {
        history.push({ role, parts: [{ text: msg.text }] });
        lastRole = role;
      }
    }

    // Gemini works best when the conversation starts with a 'user' turn.
    const firstUserIdx = history.findIndex(h => h.role === 'user');
    return firstUserIdx !== -1 ? history.slice(firstUserIdx) : [];
  };

  const regenerateMessage = async (msgId: string) => {
    if (loading) return;
    vibrate(20);
    const msgToReplace = session.messages.find((m:any) => m.id === msgId);
    if (!msgToReplace) return;

    const existingVersions = msgToReplace.versions || [msgToReplace.text];
    if (existingVersions.length >= 100) {
        setAppToast?.("Resonance capacity reached (100).");
        return;
    }

    setLoading(true);
    const msgIndex = session.messages.findIndex((m:any) => m.id === msgId);
    
    // Get history up to this point
    const contents = formatHistoryForGemini(session.messages.slice(0, msgIndex));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const persona = currentPersona;
      const stream = await ai.models.generateContentStream({ 
        model: "gemini-3-flash-preview", 
        contents: contents,
        config: { systemInstruction: getEnhancedSystemPrompt(character, persona), temperature: 1.0, thinkingConfig: { thinkingBudget: 0 } }
      });
      let fullText = "";
      for await (const chunk of stream) { if (chunk.text) fullText += chunk.text; }
      const newVersions = [...existingVersions, fullText];
      onUpdateSession((prev: ChatSession) => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msgId ? { ...m, text: fullText, versions: newVersions, currentVersionIndex: newVersions.length - 1 } : m)
      }));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    vibrate();
    
    const userMsgId = generateId("msg_u_");
    const modelMsgId = generateId("msg_m_");
    
    const userMsg: Message = { id: userMsgId, role: "user", text: input.trim(), personaId: activePersonaId, timestamp: Date.now() };
    const modelMsg: Message = { id: modelMsgId, role: "model", text: "", timestamp: Date.now(), isGenerating: true, versions: [], currentVersionIndex: 0 };
    
    // Add messages to internal state immediately for responsiveness
    const updatedMessages = [...session.messages, userMsg, modelMsg];
    onUpdateSession((prev: ChatSession) => ({ ...prev, messages: updatedMessages, lastActive: Date.now() }));
    
    // Prepare history for API
    const contents = formatHistoryForGemini(updatedMessages.filter(m => !m.isGenerating), character.greeting, currentPersona.name);

    setInput("");
    setLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const persona = currentPersona;
      const systemPrompt = getEnhancedSystemPrompt(character, persona);
      
      const stream = await ai.models.generateContentStream({ 
        model: "gemini-3-flash-preview", 
        contents: contents,
        config: { 
          systemInstruction: systemPrompt, 
          temperature: 1.0,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      let fullText = "";
      for await (const chunk of stream) { 
        if (chunk.text) { 
          fullText += chunk.text; 
          onUpdateSession((prev: ChatSession) => ({
            ...prev,
            messages: prev.messages.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m)
          }));
        } 
      }
      onUpdateSession((prev: ChatSession) => ({
        ...prev,
        messages: prev.messages.map(m => m.id === modelMsgId ? { ...m, text: fullText, isGenerating: false, versions: [fullText], currentVersionIndex: 0 } : m)
      }));
    } catch (e) { 
      console.error(e);
      setAppToast?.("Neural Link Failed.");
    } finally { setLoading(false); }
  };

  const switchVersion = (msgId: string, direction: 'prev' | 'next') => {
    const msg = session.messages.find((m:any) => m.id === msgId);
    if (!msg || !msg.versions) return;
    vibrate(5);
    const currentIndex = msg.currentVersionIndex ?? 0;
    
    if (direction === 'prev') {
        if (currentIndex > 0) {
            onUpdateSession((prev: ChatSession) => ({
                ...prev,
                messages: prev.messages.map((m: any) => 
                  m.id === msgId ? { ...m, text: m.versions[currentIndex - 1], currentVersionIndex: currentIndex - 1 } : m
                )
            }));
        }
    } else {
        if (currentIndex === msg.versions.length - 1) {
            regenerateMessage(msgId);
        } else {
            onUpdateSession((prev: ChatSession) => ({
                ...prev,
                messages: prev.messages.map((m: any) => 
                  m.id === msgId ? { ...m, text: m.versions[currentIndex + 1], currentVersionIndex: currentIndex + 1 } : m
                )
            }));
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
      <div 
        className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] pointer-events-none opacity-[0.12] blur-[150px] animate-pulse transition-all duration-1000 z-0"
        style={{ 
          background: `radial-gradient(circle at center, ${characterHex} 0%, transparent 70%)` 
        }}
      />

      <div className="h-16 flex-none border-b border-white/5 bg-[#121212]/40 backdrop-blur-xl z-20">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
            <div className="relative">
               <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="md" initial={character.initial} />
               <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ boxShadow: `0 0 20px 2px ${characterHex}` }} />
            </div>
            <div>
              <div className="font-black text-white uppercase text-sm tracking-tighter flex items-center gap-1.5">{character.name} <button onClick={() => setShowChatMenu(!showChatMenu)}><MoreVertical size={14} className="text-slate-700" /></button></div>
              <div className="text-[8px] text-primary font-black uppercase tracking-widest">{loading ? 'Synthesizing...' : 'Direct Link'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-10 no-scrollbar pb-24 z-10" ref={scrollRef}>
        <div className="max-w-4xl mx-auto w-full space-y-12">
          {character.greeting && session.messages.length === 0 && (
             <div className="flex justify-start animate-in fade-in duration-700">
               <div className="flex max-w-[92%] gap-3 items-start md:max-w-[80%]">
                 <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="sm" initial={character.initial} className="mt-1" />
                 <div 
                  className="px-5 py-4 bg-[#1a1a1a]/95 backdrop-blur-lg text-slate-100 border border-white/10 rounded-[2rem] rounded-tl-none shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] transition-all"
                  style={{ boxShadow: `0 10px 50px -15px ${characterHex}50` }}
                 >
                   {replaceUserPlaceholder(character.greeting, currentPersona.name).split('\n').map((l, i) => <p key={i} className="mb-2 last:mb-0 font-medium leading-relaxed">{renderFormattedText(l)}</p>)}
                 </div>
               </div>
             </div>
          )}
          
          {session.messages.map((msg: Message) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center py-4">
                  <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className={`flex max-w-[92%] gap-3 items-start md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'model' && <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="sm" initial={character.initial} className="mt-1" />}
                  
                  <div className="flex flex-col gap-3">
                    <div 
                      className={`group relative px-5 py-4 rounded-[2rem] text-[15px] shadow-2xl transition-all ${
                        msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 
                        'bg-[#1a1a1a]/95 backdrop-blur-lg text-slate-100 border border-white/10 rounded-tl-none'
                      }`}
                      style={msg.role === 'model' ? { boxShadow: `0 15px 60px -15px ${characterHex}70` } : {}}
                    >
                      {msg.text.split('\n').map((l, i) => (
                        <p key={i} className="mb-2 last:mb-0 font-medium leading-relaxed">
                          {renderFormattedText(l)}
                        </p>
                      ))}
                      {msg.isGenerating && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse rounded-full" />}
                    </div>

                    {msg.role === 'model' && !msg.isGenerating && (
                      <div className="flex items-center gap-3 px-2 animate-in slide-in-from-top-4 duration-500">
                         <button 
                          onClick={() => switchVersion(msg.id, 'prev')} 
                          disabled={msg.currentVersionIndex === 0}
                          className={`w-10 h-10 flex items-center justify-center rounded-full border border-white/10 transition-all ${msg.currentVersionIndex === 0 ? 'text-slate-800 opacity-10 cursor-not-allowed' : 'bg-[#1a1a1a] text-white hover:bg-white/10 active:scale-90 shadow-xl'}`}
                         >
                           <ArrowLeft size={20} strokeWidth={3} />
                         </button>
                         
                         <div className="px-5 py-2 bg-[#1a1a1a] rounded-full border border-white/10 flex items-center gap-2 shadow-inner">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Resonance</span>
                            <span className="text-xs font-black text-primary tabular-nums">
                              {(msg.currentVersionIndex || 0) + 1} <span className="text-white/20 mx-1">/</span> {msg.versions?.length || 1}
                            </span>
                         </div>

                         <button 
                          onClick={() => switchVersion(msg.id, 'next')} 
                          className={`w-10 h-10 flex items-center justify-center rounded-full border border-white/10 transition-all bg-[#1a1a1a] text-white hover:bg-white/10 active:scale-90 shadow-xl`}
                          title={msg.currentVersionIndex === (msg.versions?.length || 1) - 1 ? "Generate New Resonance" : "Next Resonance"}
                         >
                           {msg.currentVersionIndex === (msg.versions?.length || 1) - 1 ? 
                              <Plus size={20} strokeWidth={3} className="text-primary animate-pulse" /> : 
                              <ArrowRight size={20} strokeWidth={3} />
                           }
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#121212]/60 backdrop-blur-3xl border-t border-white/5 p-4 pb-10 z-20 flex-none">
        <div className="max-w-4xl mx-auto w-full flex items-end gap-3 bg-[#1a1a1a]/90 p-3 rounded-[2.5rem] border border-white/10 shadow-2xl ring-1 ring-white/5">
          <textarea 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder={`Neural transmission...`} 
            className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm py-2 px-4 resize-none no-scrollbar font-medium placeholder:text-slate-700 leading-relaxed" 
            rows={1} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || loading} 
            className={`p-4 rounded-full transition-all flex-none ${input.trim() ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95' : 'bg-white/5 text-slate-800'}`}
          >
            <Check size={20} />
          </button>
        </div>
      </div>

      {showChatMenu && (
        <div className="fixed inset-0 z-[110] flex items-start justify-end p-4 pt-20" onClick={() => setShowChatMenu(false)}>
            <div className="w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setShowPersonaShift(true); setShowChatMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase border-b border-white/5 text-primary"><UserPlus size={16} /> Shift Persona</button>
                <button onClick={() => { handleDownloadChat(character, session, currentPersona); setShowChatMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase border-b border-white/5 text-amber-500"><Download size={16} /> Export Dialogue</button>
                <button onClick={() => { handleShareApp(setAppToast); setShowChatMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase border-b border-white/5 text-slate-400"><Share2 size={16} /> Share App</button>
                <button onClick={() => { onUpdateSession((prev: ChatSession) => ({...prev, messages: []})); setShowChatMenu(false); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase text-red-500"><History size={16} /> Wipe History</button>
            </div>
        </div>
      )}

      {showPersonaShift && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5"><h3 className="text-base font-black uppercase tracking-tighter text-white">Select Resonance</h3></div>
              <div className="max-h-[260px] overflow-y-auto p-3 space-y-2 no-scrollbar">
                {personas.map((p: Persona) => (
                  <button key={p.id} onClick={() => { setActivePersonaId(p.id); setShowPersonaShift(false); }} className={`w-full p-4 rounded-xl text-left flex items-center justify-between transition-all ${activePersonaId === p.id ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
                    <div><div className="font-black text-sm leading-tight">{p.name}</div><div className="text-[9px] opacity-60 truncate max-w-[140px]">{p.bio}</div></div>
                    {activePersonaId === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-white/5 text-center"><button onClick={() => setShowPersonaShift(false)} className="py-2 text-slate-600 font-black uppercase text-[9px]">Cancel</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);