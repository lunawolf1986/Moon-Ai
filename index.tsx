
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
  Mic,
  MicOff,
  RefreshCw,
  Edit3,
  Play,
  Type,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
  Hash,
  Copy,
  Trash2,
  MoreVertical,
  X,
  Check,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Command,
  ZapOff,
  Layout,
  Info,
  Wand2,
  Lock,
  Globe,
  Tag,
  AlertTriangle,
  BrainCircuit,
  History,
  CheckSquare,
  Square,
  ArrowUpRight,
  Menu,
  Pencil,
  FileText,
  AlignLeft
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
  suggestions?: string[];
}

// --- Utilities ---

const vibrate = (ms: number = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
};

const handleAutoHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
};

// --- Components ---

const AbstractAvatar = ({ 
  name, 
  colorClass, 
  size = "md", 
  initial, 
  className = "" 
}: { 
  name: string, 
  colorClass: string, 
  size?: "xs" | "sm" | "md" | "lg" | "xl", 
  initial: string,
  className?: string
}) => {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0) * 13, 0);
  const dim = { xs: 24, sm: 32, md: 48, lg: 64, xl: 80 }[size];
  const shapes = [];
  for (let i = 0; i < 5; i++) {
    const seed = hash * (i + 1);
    const cx = (seed % 100);
    const cy = ((seed >> 2) % 100);
    const r = 15 + (seed % 35);
    const rotate = (seed % 360);
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

// --- Mock Data ---

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "p_default",
    name: "Me",
    bio: "Just myself, living in the real world.",
    traits: ["Human", "Authentic"],
    isPrivate: true,
    avatarColor: "bg-blue-500",
    greeting: "Hello! It's just me today."
  }
];

// Explicitly added key to props to satisfy TypeScript's strict check when mapping in lists
const CharacterCard = ({ character, onStartChat }: { character: any, onStartChat: (id: string) => void, key?: React.Key }) => (
  <div className="bg-[#1a1a1a] rounded-3xl p-4 shadow-xl border border-white/5 flex flex-col gap-3 hover:border-primary/40 transition-all group active:scale-[0.98]">
    <div className="flex items-start justify-between">
      <AbstractAvatar name={character.name} colorClass={character.color} size="md" initial={character.initial} />
      <button onClick={() => onStartChat(character.id)} className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Chat</button>
    </div>
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-black text-lg text-white group-hover:text-primary transition-colors">{character.name}</h3>
        {character.maturityLevel === 'unrestricted' && <span className="text-[8px] font-black bg-purple-600/30 text-purple-200 px-1.5 py-0.5 rounded border border-purple-500/30">X</span>}
      </div>
      {character.subtitle && <p className="text-primary/70 text-[10px] font-black uppercase tracking-widest mb-1 italic">{character.subtitle}</p>}
      <p className="text-slate-400 text-xs line-clamp-2 mt-1 font-medium leading-tight">{character.tagline}</p>
    </div>
    <div className="flex items-center text-[9px] text-slate-500 mt-auto pt-3 border-t border-white/5 uppercase font-bold tracking-widest">
      <span className="text-slate-400">{character.creator}</span>
      <span className="mx-2 opacity-30">•</span>
      <span>{character.engagement}</span>
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
    return saved ? JSON.parse(saved) : { name: "Genesis User", handle: "@you", avatarInitial: "U" };
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
      const char = characters.find(c => c.id === charId);
      const newChat: ChatSession = {
        id: `chat_${Date.now()}`,
        characterId: charId,
        messages: char?.greeting ? [{
            id: `msg_${Date.now()}_init`,
            role: "model",
            text: char.greeting,
            versions: [char.greeting], 
            currentVersionIndex: 0,
            timestamp: Date.now()
        }] : [],
        lastActive: Date.now()
      };
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
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
                 const systemMsg: Message = { id: `system_${Date.now()}`, role: "system", text: `Manifestation Shift: Active Persona is now ${targetPersona.name}.`, timestamp: Date.now() };
                 setChats(prev => prev.map(c => c.id === session.id ? { ...c, messages: [...c.messages, systemMsg] } : c));
               }
            }}
            onBack={() => setActiveChatId(null)}
            onUpdateSession={(updatedSession: ChatSession) => { setChats(prev => prev.map(c => c.id === updatedSession.id ? updatedSession : c)); }}
            onUpdateCharacter={(updates: Partial<Character>) => { setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, ...updates } : c)); }}
            onDeleteChat={(id: string) => { setChats(prev => prev.filter(c => c.id !== id)); setActiveChatId(null); }}
            onCreatePersona={() => { setCreateViewMode("persona"); setActiveChatId(null); setActiveTab("create"); }}
          />
        );
      }
      setActiveChatId(null); 
    }
    switch (activeTab) {
      case "for_you": return <ForYouView characters={characters} onStartChat={startChat} />;
      case "featured": return <FeaturedView characters={characters} onStartChat={startChat} />;
      case "explore": return <ExploreView characters={characters} onStartChat={startChat} />;
      case "chat": return <ChatListView chats={chats} characters={characters} onOpenChat={setActiveChatId} />;
      case "create": return <CreateView initialMode={createViewMode} userProfile={userProfile} onCreateCharacter={(c: any) => { setCharacters([c, ...characters]); setActiveTab("library"); }} onCreatePersona={(p: any) => { setPersonas([p, ...personas]); setActiveTab("profile"); }} onBack={() => setActiveTab('for_you')} />;
      case "library": return <LibraryView chats={chats} characters={characters} personas={personas} userProfile={userProfile} />;
      case "profile": return <ProfileView personas={personas} activePersonaId={activePersonaId} setActivePersonaId={(id: string) => { setActivePersonaId(id); const p = personas.find(pers => pers.id === id); if (p) setAppToast(`Manifested: ${p.name}`); }} chats={chats} updatePersona={(p: any) => setPersonas(prev => prev.map(o => o.id === p.id ? p : o))} userProfile={userProfile} setUserProfile={setUserProfile} />;
      case "settings": return <SettingsView />;
      default: return <ForYouView characters={characters} onStartChat={startChat} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#e0e0e0] font-sans overflow-hidden">
      {!activeChatId && (
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#121212]/80 backdrop-blur-xl z-50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">M</div>
             <h1 className="text-xl font-black tracking-tighter uppercase text-white">Moonai</h1>
          </div>
          <button className="p-2 text-slate-500 hover:text-white transition-colors"><Search size={20} /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar relative">{renderTabContent()}</div>
      
      {appToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <Check size={14} /> {appToast}
        </div>
      )}
      
      {!activeChatId && (
        <div className="h-20 bg-[#1a1a1a]/90 backdrop-blur-md border-t border-white/5 flex-none z-50">
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center h-full overflow-x-auto no-scrollbar px-6 space-x-1">
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
  <button onClick={() => set(id)} className={`flex flex-col items-center justify-center min-w-[72px] h-16 rounded-xl transition-all duration-200 ${active === id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
    <Icon size={20} strokeWidth={active === id ? 3 : 2} className={active === id ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : ""} />
    <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{label}</span>
  </button>
);

const ForYouView = ({ characters, onStartChat }: any) => (
  <div className="max-w-6xl mx-auto p-4 pb-24 space-y-10">
    <header className="mt-4 mb-2">
      <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-white to-blue-300 tracking-tighter">Ready for more?</h1>
      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 opacity-60">Echo through the multiverse</p>
    </header>
    <section>
      <h2 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 px-1 flex items-center gap-2"><Zap size={14} className="fill-primary" /> Pick of the day</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{characters.slice(0, 2).map((c: any) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
    </section>
    <section>
      <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-1">Recent Additions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{characters.slice(2).map((c: any) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
    </section>
  </div>
);

const FeaturedView = ({ characters, onStartChat }: any) => (
  <div className="max-w-6xl mx-auto p-4 pb-24">
    <h1 className="text-3xl font-black mb-8 uppercase tracking-tighter text-white">Originals</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{characters.map((c: any) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
  </div>
);

const ExploreView = ({ characters, onStartChat }: any) => {
  const [search, setSearch] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const filtered = characters.filter((c: Character) => (search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) && (selectedTraits.length === 0 || selectedTraits.every(s => c.tags.some(t => t.toLowerCase() === s.toLowerCase()))));
  const availableTraits = ["Fantasy", "Sci-Fi", "Adventure", "Funny", "Narrative", "Roleplay", "Modern", "Marvel", "DC", "Military", "Action"];
  return (
    <div className="max-w-6xl mx-auto p-4 pb-24">
      <div className="relative mb-8 max-w-2xl mx-auto">
        <Search className="absolute left-4 top-4 text-slate-600" size={20} />
        <input type="text" placeholder="Search identities..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-600 shadow-inner" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Filter</span>
        {selectedTraits.length > 0 && <button onClick={() => { vibrate(); setSelectedTraits([]); }} className="text-[10px] font-black text-primary hover:text-white uppercase">Clear</button>}
      </div>
      <div className="flex flex-wrap gap-2 mb-10">
        {availableTraits.map(tag => (
          <button key={tag} onClick={() => { vibrate(); setSelectedTraits(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]); }} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border uppercase tracking-widest ${selectedTraits.includes(tag) ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-[#1a1a1a]/30 border-white/5 text-slate-500"}`}>{tag}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.length > 0 ? filtered.map((c: any) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />) : <div className="flex flex-col items-center justify-center py-20 opacity-20"><Search size={48} /><p className="font-bold">No results found.</p></div>}</div>
    </div>
  );
};

const ChatListView = ({ chats, characters, onOpenChat }: any) => {
  if (chats.length === 0) return <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-20"><MessageSquare size={56} className="mb-6" /><h3 className="text-xl font-black uppercase">Silence in the Multiverse</h3></div>;
  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <h1 className="text-3xl font-black mb-8 uppercase tracking-tighter text-white">Dialogues</h1>
      <div className="space-y-3">
        {chats.map((chat: ChatSession) => {
          const char = characters.find((c: any) => c.id === chat.characterId);
          if (!char) return null;
          const lastMsg = chat.messages.filter(m => !m.isHidden).pop();
          return (
            <button key={chat.id} onClick={() => onOpenChat(chat.id)} className="w-full bg-[#1a1a1a]/40 p-4 rounded-3xl flex items-center gap-4 hover:bg-[#1a1a1a] transition-all border border-transparent hover:border-white/5 text-left active:scale-[0.98]">
              <AbstractAvatar name={char.name} colorClass={char.color} size="md" initial={char.initial} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1"><h3 className="font-black text-lg truncate text-white">{char.name}</h3><span className="text-[9px] font-black text-slate-500 uppercase">{new Date(chat.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                <p className="text-xs text-slate-500 truncate font-medium">{lastMsg ? (lastMsg.role === 'user' ? 'You: ' : '') + lastMsg.text : "Awaiting word..."}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- REUSABLE CHARACTER EDITOR COMPONENT ---
const CharacterEditor = ({ initialData, onSave, onCancel, mode, userProfile }: { initialData: Partial<Character>, onSave: (data: Partial<Character>) => void, onCancel: () => void, mode: "create" | "edit", userProfile: UserProfile }) => {
  const [name, setName] = useState(initialData.name || "");
  const [tagline, setTagline] = useState(initialData.tagline || "");
  const [subtitle, setSubtitle] = useState(initialData.subtitle || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [greeting, setGreeting] = useState(initialData.greeting || "");
  const [systemInstruction, setSystemInstruction] = useState(initialData.systemInstruction || "");
  const [memory, setMemory] = useState(initialData.memory || "");
  const [visibility, setVisibility] = useState<"public" | "private">(initialData.visibility || "public");
  const [maturity, setMaturity] = useState<MaturityLevel>(initialData.maturityLevel || "teen");
  const [isAILoading, setIsAILoading] = useState(false);

  // Check ownership
  const isEditable = mode === "create" || initialData.creator === userProfile.handle;

  // Constants for field lengths
  const MAX_NAME = 20;
  const MAX_TAGLINE = 50;
  const MAX_DESCRIPTION = 5000;
  const MAX_GREETING = 4096;

  return (
    <div className="fixed inset-0 z-[100] bg-[#121212] backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-sans">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#121212]/50 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-slate-400 p-2 hover:text-white transition-colors"><Menu size={20} /></button>
          <button onClick={onCancel} className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] hover:text-white transition-colors flex items-center gap-2">Close</button>
        </div>
        <h1 className="text-sm font-black uppercase tracking-[0.25em] text-white/90">
          {!isEditable && <span className="mr-2 inline-block"><Lock size={14} className="text-slate-500" /></span>}
          {mode === 'create' ? 'Architect Identity' : (isEditable ? 'Character Settings' : 'View Identity')}
        </h1>
        {isEditable ? (
          <button 
            onClick={() => { 
              vibrate();
              if (!name.trim()) { alert("Name is required"); return; }
              onSave({ name, tagline, subtitle, description, greeting, systemInstruction, memory, visibility, maturityLevel: maturity }); 
            }} 
            className="text-primary font-black text-xs uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
          >
            {mode === 'create' ? 'Build' : 'Save'}
          </button>
        ) : <div className="w-12"></div>}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="max-w-3xl mx-auto w-full">
          {/* Real-time Preview Card (Centered) */}
          <div className="p-8 border-b border-white/10 bg-[#1a1a1a]/40">
            <div className="flex justify-between items-center mb-6">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Live Preview</label>
              {!isEditable && <div className="px-3 py-1 bg-slate-800 border border-white/5 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">Locked Entity</div>}
              {isEditable && <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[8px] font-black text-primary uppercase tracking-widest">Active Thread</div>}
            </div>
            <div className="max-w-md mx-auto">
              <CharacterCard character={{
                id: 'preview',
                name: name || 'Identity Name',
                tagline: tagline || 'Awaiting definition...',
                creator: initialData.creator || userProfile.handle,
                engagement: initialData.engagement || '0',
                initial: (name?.[0] || 'N').toUpperCase(),
                color: initialData.color || 'bg-indigo-600',
                subtitle: subtitle,
                maturityLevel: maturity,
                tags: initialData.tags || ['Custom'],
                systemInstruction: '',
              }} onStartChat={() => {}} />
            </div>
          </div>

          <div className={`p-8 space-y-16 ${!isEditable ? 'opacity-90' : ''}`}>
            {/* Header Identity Section */}
            <section className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group">
                <AbstractAvatar name={name || 'N'} colorClass={initialData.color || 'bg-indigo-600'} size="xl" initial={(name?.[0] || 'N').toUpperCase()} />
                {isEditable && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-primary/40">
                    <ArrowUpRight size={28} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 w-full space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Character Name</label>
                    <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{name.length}/{MAX_NAME}</span>
                  </div>
                  <input 
                    readOnly={!isEditable}
                    value={name} 
                    maxLength={MAX_NAME}
                    onChange={e => setName(e.target.value)} 
                    className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-4 text-white font-bold text-xl outline-none transition-all shadow-inner placeholder:text-slate-700 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                    placeholder="e.g. Victor Von Doom"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tagline</label>
                    <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{tagline.length}/{MAX_TAGLINE}</span>
                  </div>
                  <input 
                    readOnly={!isEditable}
                    value={tagline} 
                    maxLength={MAX_TAGLINE}
                    onChange={e => setTagline(e.target.value)} 
                    className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-4 text-white font-medium text-base outline-none transition-all shadow-inner placeholder:text-slate-700 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                    placeholder="Short, catchy intro..."
                  />
                </div>
              </div>
            </section>

            {/* Public Presence Section */}
            <section className="space-y-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary border-b border-primary/10 pb-4">Public Profile</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</label>
                  <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{description.length}/{MAX_DESCRIPTION}</span>
                </div>
                <textarea 
                  readOnly={!isEditable}
                  value={description} 
                  maxLength={MAX_DESCRIPTION}
                  onChange={e => setDescription(e.target.value)} 
                  className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 text-white font-medium text-sm leading-relaxed outline-none transition-all resize-none h-[180px] overflow-y-auto shadow-inner placeholder:text-slate-700 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                  placeholder="How would others describe this character on their profile?"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Greeting</label>
                  <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{greeting.length}/{MAX_GREETING}</span>
                </div>
                <textarea 
                  readOnly={!isEditable}
                  value={greeting} 
                  maxLength={MAX_GREETING}
                  onChange={e => setGreeting(e.target.value)} 
                  className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 text-white font-medium text-sm leading-relaxed outline-none transition-all resize-none h-[180px] overflow-y-auto shadow-inner placeholder:text-slate-700 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                  placeholder="The very first thing this character says to the user..."
                />
                {isEditable && <p className="text-[9px] text-slate-600 font-medium italic px-1">Use asterisks for actions: *Iron Man smirks* "Need a hand, kid?"</p>}
              </div>
            </section>

            {/* Core Attributes Section */}
            <section className="space-y-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary border-b border-primary/10 pb-4">Character Attributes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Subtitle (Title)</label>
                  <input 
                    readOnly={!isEditable}
                    value={subtitle} 
                    onChange={e => setSubtitle(e.target.value)} 
                    className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-4 text-white font-medium text-sm outline-none transition-all shadow-inner placeholder:text-slate-700 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                    placeholder="e.g. Iron Man"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Visibility</label>
                  <div className={`flex bg-[#1e1e1e] p-1.5 rounded-2xl border border-white/10 h-[54px] ${!isEditable ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => setVisibility('public')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visibility === 'public' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Public</button>
                    <button onClick={() => setVisibility('private')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visibility === 'private' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Private</button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Maturity Level</label>
                <div className={`flex bg-[#1e1e1e] p-1.5 rounded-[2rem] border border-white/10 gap-1.5 shadow-inner ${!isEditable ? 'opacity-50 pointer-events-none' : ''}`}>
                  {[
                    { id: "everyone", label: "E", desc: "Gentle" },
                    { id: "teen", label: "T", desc: "Mild" },
                    { id: "mature", label: "M", desc: "Grit" },
                    { id: "unrestricted", label: "X", desc: "Raw" }
                  ].map((lvl) => (
                    <button 
                      key={lvl.id}
                      disabled={!isEditable}
                      onClick={() => { vibrate(); setMaturity(lvl.id as MaturityLevel); }}
                      className={`flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all ${maturity === lvl.id ? `bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105` : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                      <span className="text-sm font-black tracking-tight">{lvl.label}</span>
                      <span className="text-[8px] font-bold uppercase opacity-50 tracking-widest">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Behavior & Lore Section */}
            <section className="space-y-10">
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Advanced Definitions</h3>
                {isEditable && (
                  <button 
                    onClick={async () => { setIsAILoading(true); const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const r = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Generate a structured character definition with core traits and dialogue examples for: ${name}. Current lore: ${description}` }); setSystemInstruction(r.text || ""); setIsAILoading(false); }} 
                    disabled={isAILoading} 
                    className="text-[10px] font-black text-primary uppercase flex items-center gap-2 hover:text-white transition-colors bg-primary/5 px-4 py-2 rounded-full border border-primary/20"
                  >
                    {isAILoading ? <RefreshCw className="animate-spin" size={12} /> : <Wand2 size={12} />} AI Architect
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Behavioral Logic & Lore</label>
                <textarea 
                  readOnly={!isEditable}
                  value={systemInstruction} 
                  onChange={e => setSystemInstruction(e.target.value)} 
                  className={`w-full bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-8 text-white font-mono text-xs leading-relaxed outline-none transition-all resize-none h-[450px] overflow-y-auto shadow-inner placeholder:text-slate-800 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                  placeholder="Deep behavioral logic, secrets, dialogue examples, and world-building facts..."
                />
              </div>
            </section>

            {/* Persistence Section */}
            <section className="space-y-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary border-b border-primary/10 pb-4">Persistence Memory</h3>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Permanent Legacy Node</label>
                <textarea 
                  readOnly={!isEditable}
                  value={memory} 
                  onChange={e => setMemory(e.target.value)} 
                  className={`w-full bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 text-white font-medium text-xs leading-relaxed outline-none transition-all resize-none h-[140px] overflow-y-auto shadow-inner placeholder:text-slate-800 ${isEditable ? 'focus:border-primary/50' : 'cursor-default opacity-60'}`}
                  placeholder="Narrative developments to remember across all threads..."
                />
              </div>
            </section>
          </div>
        </div>
      </div>
      
      {/* Bottom Save Action (Mobile Dock) */}
      <div className="p-6 bg-[#121212]/90 border-t border-white/10 sticky bottom-0 z-30 flex justify-center">
        {isEditable ? (
          <button 
            onClick={() => { 
              vibrate();
              if (!name.trim()) { alert("Name is required"); return; }
              onSave({ name, tagline, subtitle, description, greeting, systemInstruction, memory, visibility, maturityLevel: maturity }); 
            }} 
            className="w-full max-w-lg bg-primary text-white font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-[0_0_50px_rgba(59,130,246,0.3)] active:scale-95 transition-all"
          >
            {mode === 'create' ? 'Manifest Entity' : 'Commit Changes'}
          </button>
        ) : (
          <button 
            onClick={onCancel}
            className="w-full max-w-lg bg-slate-800 text-slate-400 font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-[10px] active:scale-95 transition-all"
          >
            Done Viewing
          </button>
        )}
      </div>
    </div>
  );
};

const CreateView = ({ onCreateCharacter, onCreatePersona, onBack, initialMode, userProfile }: any) => {
  const [mode, setMode] = useState<"character" | "persona">(initialMode || "character");
  const [personaName, setPersonaName] = useState("");
  const [personaBio, setPersonaBio] = useState("");
  const [personaTraits, setPersonaTraits] = useState("");

  if (mode === 'character') {
    return (
      <CharacterEditor 
        mode="create"
        userProfile={userProfile}
        initialData={{ color: 'bg-indigo-600', initial: 'N', creator: userProfile.handle, engagement: '0', tags: ['Custom'], maturityLevel: 'teen', visibility: 'public' }}
        onCancel={onBack}
        onSave={(data) => {
          onCreateCharacter({ 
            id: `char_${Date.now()}`, 
            initial: data.name![0].toUpperCase(),
            color: 'bg-indigo-600',
            creator: userProfile.handle,
            engagement: '0',
            tags: ['Custom'],
            ...data 
          });
        }}
      />
    );
  }

  // Legacy Persona creation UI
  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1a1a1a]/80 backdrop-blur z-20 sticky top-0">
        <button onClick={onBack} className="p-2 -ml-4 text-slate-400"><ChevronLeft size={24} /></button>
        <h1 className="text-base font-black uppercase tracking-tighter text-white">Architect Persona</h1>
        <button 
          onClick={() => { vibrate(); onCreatePersona({ id: `p_${Date.now()}`, name: personaName, bio: personaBio, traits: personaTraits.split(",").map(t => t.trim()), isPrivate: true, avatarColor: "bg-pink-600" }); }} 
          className="text-primary font-black text-xs uppercase tracking-widest hover:text-white"
        >
          Build
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        <div className="flex bg-[#1a1a1a]/50 rounded-2xl p-1 border border-white/5 max-w-2xl mx-auto w-full">
          <button className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "character" ? "bg-primary text-white shadow-lg" : "text-slate-500"}`} onClick={() => { vibrate(); setMode("character"); }}>Character</button>
          <button className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === "persona" ? "bg-primary text-white shadow-lg" : "text-slate-500"}`} onClick={() => { vibrate(); setMode("persona"); }}>Persona</button>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto w-full">
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Persona Name</label><input value={personaName} onChange={e => setPersonaName(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-white font-bold" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Traits (comma separated)</label><input value={personaTraits} onChange={e => setPersonaTraits(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-white font-bold" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Bio</label><textarea value={personaBio} onChange={e => setPersonaBio(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-white font-medium h-32" /></div>
        </div>
      </div>
    </div>
  );
};

const LibraryView = ({ characters, personas, userProfile }: any) => (
  <div className="max-w-6xl mx-auto p-4 pb-24">
    <h1 className="text-3xl font-black mb-8 uppercase tracking-tighter text-white">Archive</h1>
    <section className="mb-10">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Saved Personas</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{personas.map((p: any) => <div key={p.id} className="bg-[#1a1a1a]/30 p-4 rounded-3xl border border-white/5"><div className="font-black text-white text-sm mb-1">{p.name}</div><div className="text-[9px] font-black text-primary uppercase truncate tracking-widest">{p.traits.join(" • ")}</div></div>)}</div>
    </section>
    <section>
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Pinned Entities</h2>
      <div className="space-y-3">{characters.filter((c: any) => c.creator === userProfile.handle).map((c: any) => <div key={c.id} className="flex items-center gap-4 p-4 bg-[#1a1a1a]/30 rounded-3xl border border-white/5"><AbstractAvatar name={c.name} colorClass={c.color} size="sm" initial={c.initial} /><div className="flex-1"><div className="font-black text-sm text-white">{c.name}</div><div className="text-[9px] text-slate-500 font-bold uppercase italic tracking-widest">Self Build</div></div></div>)}</div>
    </section>
  </div>
);

const ProfileView = ({ personas, activePersonaId, setActivePersonaId, chats, updatePersona, userProfile, setUserProfile }: any) => {
  const [editingPersona, setEditingPersona] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [tempHandle, setTempHandle] = useState(userProfile.handle);

  const totalMsgs = chats ? chats.reduce((acc: number, c: any) => acc + c.messages.filter((m: any) => m.role === 'user').length, 0) : 0;
  
  const saveProfile = () => {
    vibrate();
    setUserProfile({ 
      ...userProfile, 
      name: tempName, 
      handle: tempHandle.startsWith('@') ? tempHandle : `@${tempHandle}`,
      avatarInitial: tempName[0]?.toUpperCase() || "U"
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 relative">
      <div className="flex items-center gap-6 mb-10 pt-4 px-2 group">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-primary via-indigo-600 to-purple-700 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-[0_20px_50px_rgba(59,130,246,0.2)] rotate-2 ring-1 ring-white/10 text-white">
            {userProfile.avatarInitial}
          </div>
          <button 
            onClick={() => { setIsEditingProfile(true); setTempName(userProfile.name); setTempHandle(userProfile.handle); }}
            className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil size={14} />
          </button>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter cursor-pointer hover:text-primary transition-colors" onClick={() => { setIsEditingProfile(true); setTempName(userProfile.name); setTempHandle(userProfile.handle); }}>{userProfile.name}</h1>
            <button 
              onClick={() => { setIsEditingProfile(true); setTempName(userProfile.name); setTempHandle(userProfile.handle); }}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <Edit3 size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{userProfile.handle}</span>
            <div className="inline-block bg-primary/20 text-primary border border-primary/40 px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(59,130,246,0.15)]">Lvl. 01 Weaver</div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 px-1">Active Manifestation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((p: any) => (
            <div 
              key={p.id} 
              onClick={() => { setActivePersonaId(p.id); vibrate(); }} 
              className={`w-full flex items-center justify-between p-5 rounded-[2.5rem] transition-all cursor-pointer border-2 ${
                activePersonaId === p.id 
                ? "bg-primary border-primary shadow-[0_0_30px_rgba(59,130,246,0.3)] text-white" 
                : "bg-[#1a1a1a] border-white/5 text-slate-400 hover:border-primary/20"
              }`}
            >
               <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 ${p.avatarColor} rounded-2xl flex-none flex items-center justify-center text-white text-xl font-black shadow-lg ring-1 ring-white/10`}>{p.name[0]}</div>
                  <div className="text-left min-w-0">
                    <div className="font-black text-lg tracking-tight truncate">{p.name}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest truncate ${activePersonaId === p.id ? 'opacity-80' : 'opacity-40'}`}>{p.bio}</div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                 {activePersonaId === p.id && <div className="p-1.5 bg-white/20 rounded-full shadow-inner"><Check size={16} /></div>}
                 <button onClick={(e) => { e.stopPropagation(); setEditingPersona(p); vibrate(); }} className={`p-2 rounded-xl transition-all ${activePersonaId === p.id ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}><Edit3 size={16} /></button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-8 bg-[#1a1a1a]/30 rounded-[3rem] border border-white/5 text-center flex flex-col items-center justify-center"><div className="text-3xl font-black text-white mb-1">{totalMsgs}</div><div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Echos Sent</div></div>
        <div className="p-8 bg-[#1a1a1a]/30 rounded-[3rem] border border-white/5 text-center flex flex-col items-center justify-center"><div className="text-3xl font-black text-white mb-1">∞</div><div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Memory Nodes</div></div>
      </div>

      {/* Edit Identity Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-8 border-b border-white/5 flex-none">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Edit Weaver</h2>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-500 p-2"><X size={28} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Display Name</label>
                <input 
                  value={tempName} 
                  onChange={e => setTempName(e.target.value)} 
                  className="w-full bg-[#121212] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary/50 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Handle</label>
                <input 
                  value={tempHandle} 
                  onChange={e => setTempHandle(e.target.value)} 
                  placeholder="@handle"
                  className="w-full bg-[#121212] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary/50 transition-all" 
                />
                <p className="text-[9px] text-slate-600 font-medium px-1 uppercase tracking-widest">Handle determines character ownership nodes.</p>
              </div>
              <button 
                onClick={saveProfile}
                className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs mt-4 active:scale-95 transition-all"
              >
                Sync Identity
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPersona && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-8 border-b border-white/5 flex-none"><h2 className="text-xl font-black uppercase tracking-tighter text-white">Morph Identity</h2><button onClick={() => setEditingPersona(null)} className="text-slate-500 p-2"><X size={28} /></button></div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name</label><input value={editingPersona.name} onChange={e => setEditingPersona({...editingPersona, name: e.target.value})} className="w-full bg-[#121212] border border-white/5 rounded-2xl p-4 text-white font-bold" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Biography</label><textarea value={editingPersona.bio} onChange={e => setEditingPersona({...editingPersona, bio: e.target.value})} className="w-full bg-[#121212] border border-white/5 rounded-2xl p-4 text-white font-medium h-32 leading-relaxed" /></div>
            </div>
            <div className="p-8 border-t border-white/5 bg-[#1a1a1a]/50"><button onClick={() => { updatePersona(editingPersona); setEditingPersona(null); vibrate(); }} className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs">Commit Manifestation</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = () => (
  <div className="max-w-3xl mx-auto p-4 pb-24">
    <h1 className="text-3xl font-black mb-10 uppercase tracking-tighter text-white">Settings</h1>
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] rounded-[2.5rem] p-6 flex items-center justify-between border border-white/5"><div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-2xl text-primary"><Shield size={24} /></div><div><div className="font-black text-white text-sm uppercase tracking-tight">Sanity Protection</div><div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Active Filter</div></div></div><div className="w-12 h-7 bg-primary/20 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-5 h-5 bg-primary rounded-full shadow-lg"></div></div></div>
      <div className="bg-[#1a1a1a] rounded-[2.5rem] p-6 flex items-center justify-between border border-white/5 cursor-pointer hover:bg-red-500/10 transition-all" onClick={() => { if(confirm('Reset all nodes?')) { localStorage.clear(); window.location.reload(); } }}><div className="flex items-center gap-4"><div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><LogOut size={24} /></div><div className="text-red-500 font-black text-sm uppercase tracking-tight">System Wipe</div></div></div>
    </div>
  </div>
);

// --- CHAT INTERFACE & LOGIC ---

const ChatInterface = ({ session, character, personas, activePersonaId, setActivePersonaId, onBack, onUpdateSession, onUpdateCharacter, onDeleteChat, onCreatePersona, userProfile, setAppToast }: any) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSyncingMemory, setIsSyncingMemory] = useState(false);
  const [pendingPersona, setPendingPersona] = useState<Persona | null>(null);
  const [isViewingSettings, setIsViewingSettings] = useState(false);
  const [showMemorySelector, setShowMemorySelector] = useState(false);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [generatedMemory, setGeneratedMemory] = useState("");
  const [showMemoryEditor, setShowMemoryEditor] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);

  // Check ownership
  const isOwner = character.creator === userProfile.handle;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session.messages, loading]);

  const generateMemoryFromSelection = async () => {
    if (selectedMsgIds.size === 0) return;
    vibrate();
    setIsSyncingMemory(true);
    try {
      const selectedMsgs = session.messages.filter((m: any) => selectedMsgIds.has(m.id));
      const transcript = selectedMsgs.map((m: any) => `${m.role === 'user' ? 'User' : character.name}: ${m.text}`).join('\n');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: [{ role: "user", parts: [{ text: `Identify and summarize key narrative developments for ${character.name} to remember permanently. Focus on relationships, plot twists, and personal facts about the user. Format as bullet points.\n\nTranscript:\n${transcript}` }] }], config: { temperature: 0.6 } });
      setGeneratedMemory(response.text || ""); setShowMemorySelector(false); setShowMemoryEditor(true);
    } catch (e) { console.error(e); } finally { setIsSyncingMemory(false); }
  };

  const consolidateMemory = async () => {
    if (!character.memory) return;
    vibrate();
    setIsConsolidating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: [{ role: "user", parts: [{ text: `Please consolidate and reorganize the following character memory log into a concise, well-structured narrative record. Remove redundancies, combine similar points, and maintain key details about user relationships, secret plot twists, and personal facts. Maintain a high-quality roleplay tone.\n\nExisting Memory:\n${character.memory}` }] }], 
        config: { temperature: 0.4 } 
      });
      if (response.text) {
        onUpdateCharacter({ memory: response.text });
        setAppToast?.("Legacy Nodes Consolidated");
      }
    } catch (e) { console.error(e); } finally { setIsConsolidating(false); }
  };

  const handleSend = async (overrideText?: string, isHidden: boolean = false, regenerateId?: string) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : null) || input;
    if (!textToSend.trim() && !regenerateId || loading) return;
    vibrate();
    let modelMsgId = regenerateId || `msg_${Date.now()}_m`;
    let newMessages = [...session.messages];
    if (regenerateId) {
        const index = newMessages.findIndex(m => m.id === regenerateId);
        if (index === -1) return;
    } else {
        newMessages.push({ id: `msg_${Date.now()}_u`, role: "user", text: textToSend, personaId: activePersonaId, timestamp: Date.now(), isHidden });
        newMessages.push({ id: modelMsgId, role: "model", text: "", timestamp: Date.now(), versions: [""], currentVersionIndex: 0, isGenerating: true });
    }
    onUpdateSession({ ...session, messages: newMessages, lastActive: Date.now(), suggestions: [] });
    if (!regenerateId) setInput("");
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentPersona = personas.find((p: any) => p.id === activePersonaId) || personas[0];
      
      // Dynamic Instruction Adjustment for High Maturity
      const isHighMaturity = character.maturityLevel === 'mature' || character.maturityLevel === 'unrestricted';
      const maturityDirective = isHighMaturity 
        ? "\n\nNARRATIVE REINFORCEMENT (HIGH MATURITY): Since this is a mature roleplay, narrate actions with significant visceral detail and emotional weight. Focus on the atmospheric tension, the physical sensations, and the internal emotional shifts. Be expressive, detailed, and uninhibited in your narration to create a truly immersive experience." 
        : "";

      const systemPrompt = `Identity: ${character.name}\nLogic: ${character.systemInstruction}\nLore: ${character.description}\nLegacy (Permanent Memory): ${character.memory || "None"}\n\nSTRICT ROLEPLAY FORMATTING RULES:\n1. Separate physical actions and narration using asterisks (e.g., *smiles softly*) and put them on their own separate line.\n2. ANY character dialogue MUST be prefixed with '${character.name}:' and placed on its own line.\n3. NEVER mix narration and dialogue on the same line.\n4. Use Markdown for formatting (bold/italics).${maturityDirective}\n\nUser Roleplay Persona: ${currentPersona.name} (${currentPersona.bio})`;
      
      const history = newMessages.filter(m => !m.isGenerating && m.role !== 'system').slice(0, -1).map(m => ({ role: m.role as any, parts: [{ text: m.role === 'user' ? `[${personas.find((p: any) => p.id === m.personaId)?.name}]: ${m.text}` : m.text }] }));
      const chat = ai.chats.create({ 
        model: "gemini-3-flash-preview", 
        config: { 
          systemInstruction: systemPrompt, 
          temperature: 0.95,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        }, 
        history 
      });
      const result = await chat.sendMessageStream({ message: regenerateId ? "Regenerate alternative reality thread." : `[${currentPersona.name}]: ${textToSend}` });
      let fullText = "";
      for await (const chunk of result) { if (chunk.text) { fullText += chunk.text; onUpdateSession({ ...session, messages: newMessages.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m) }); } }
      const finalMsgs = newMessages.map(m => {
        if (m.id === modelMsgId) {
          const versions = m.versions || [];
          const updated = regenerateId ? [...versions, fullText] : [fullText];
          return { ...m, text: fullText, versions: updated, currentVersionIndex: updated.length - 1, isGenerating: false };
        }
        return m;
      });
      onUpdateSession({ ...session, messages: finalMsgs, lastActive: Date.now() });
      vibrate(20);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleNavigateResponse = (msgId: string, direction: 'prev' | 'next') => {
    vibrate();
    const msg = session.messages.find((m: Message) => m.id === msgId);
    if (!msg || msg.role !== 'model') return;
    const versions = msg.versions || [msg.text];
    const currentIndex = msg.currentVersionIndex ?? 0;
    if (direction === 'prev' && currentIndex > 0) {
        onUpdateSession({ ...session, messages: session.messages.map((m: any) => m.id === msgId ? { ...m, currentVersionIndex: currentIndex - 1, text: versions[currentIndex - 1] } : m) });
    } else if (direction === 'next') {
        if (currentIndex < versions.length - 1) {
            onUpdateSession({ ...session, messages: session.messages.map((m: any) => m.id === msgId ? { ...m, currentVersionIndex: currentIndex + 1, text: versions[currentIndex + 1] } : m) });
        } else if (!loading && versions.length < 100) {
            handleSend("", false, msgId);
        }
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let processed = line.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(?!\*)([\s\S]+?)\*/g, '<em class="italic text-primary-300 font-medium">$1</em>');
      if (line.match(/^(\s*)[-*+]\s+(.*)/)) {
        return <div key={idx} className="flex gap-2 mb-1.5 pl-2"><span className="text-primary-400 font-black">•</span><span dangerouslySetInnerHTML={{ __html: processed.replace(/^(\s*)[-*+]\s+/, '') }} /></div>;
      }
      return line.trim() === '' ? <div key={idx} className="h-3" /> : <p key={idx} className="mb-2 last:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  const currentPersona = personas.find((p: any) => p.id === activePersonaId) || personas[0];

  return (
    <div className="flex flex-col h-full bg-[#121212] relative">
      <style>{`
        @keyframes msg-enter { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .msg-anim { animation: msg-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .glass-header { background: rgba(18, 18, 18, 0.85); backdrop-filter: blur(25px); }
        .bubble-user { background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); shadow: 0 4px 20px rgba(59,130,246,0.3); }
        .bubble-model { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); }
      `}</style>

      {/* Chat Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-white/5 glass-header z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => { vibrate(); onBack(); }} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={28} /></button>
          <AbstractAvatar name={character.name} colorClass={character.color} size="md" initial={character.initial} />
          <div>
            <div className="font-black text-white flex items-center gap-2 uppercase tracking-tighter text-base">
              {character.name}
              <button onClick={() => setShowChatMenu(!showChatMenu)} className="text-slate-600 hover:text-primary transition-colors"><MoreVertical size={16} /></button>
            </div>
            <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{loading ? 'Tuning...' : 'Synchronized'}</div>
          </div>
        </div>
        <button 
          onClick={() => { vibrate(); setShowPersonaMenu(true); }}
          className="w-11 h-11 rounded-[1.2rem] border border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-primary/10 flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <div className={`w-full h-full ${currentPersona.avatarColor} text-white font-black flex items-center justify-center text-lg`}>{currentPersona.name[0]}</div>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pt-6 pb-24" ref={scrollRef}>
        <div className="max-w-4xl mx-auto w-full space-y-8">
          {session.messages.map((msg: any) => {
            if (msg.isHidden) return null;
            if (msg.role === 'system') return <div key={msg.id} className="flex justify-center my-6"><div className="px-5 py-2 bg-primary/5 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3 shadow-sm shadow-primary/10 animate-in fade-in"><Sparkles size={12} className="animate-pulse" /> {msg.text}</div></div>;
            const isUser = msg.role === "user";
            const p = isUser ? personas.find((o: any) => o.id === msg.personaId) || personas[0] : null;
            const versions = msg.versions || [msg.text];
            const cIndex = msg.currentVersionIndex ?? 0;
            return (
              <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} msg-anim`}>
                <div className={`flex max-w-[88%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {isUser ? <div className={`w-9 h-9 ${p.avatarColor} rounded-xl flex-none flex items-center justify-center text-base font-black shadow-lg mt-1 ring-1 ring-white/5`}>{p.name[0]}</div> : <AbstractAvatar name={character.name} colorClass={character.color} size="sm" initial={character.initial} className="mt-1" />}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="text-[9px] font-black text-slate-600 mb-2 uppercase tracking-[0.3em] px-1">{isUser ? p.name : character.name}</div>
                    <div className={`px-5 py-4 rounded-[2rem] text-[15px] shadow-xl transition-all ${isUser ? 'bubble-user text-white rounded-tr-none' : 'bubble-model text-slate-100 rounded-tl-none'}`}>
                      {renderFormattedText(msg.text)}{msg.isGenerating && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse rounded-full" />}
                    </div>
                    {!isUser && !msg.isGenerating && (
                      <div className="flex items-center gap-5 mt-4 px-2">
                          <button disabled={cIndex === 0} onClick={() => handleNavigateResponse(msg.id, 'prev')} className="p-1 text-slate-600 hover:text-primary transition-all disabled:opacity-10"><ChevronLeft size={20} /></button>
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{cIndex + 1} / {versions.length}</span>
                          <button onClick={() => handleNavigateResponse(msg.id, 'next')} className="p-1 text-slate-600 hover:text-primary transition-all"><ChevronRight size={20} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-[#121212]/80 backdrop-blur-3xl border-t border-white/5 px-4 pt-4 pb-10 z-20">
        <div className="max-w-4xl mx-auto w-full flex items-end gap-3 bg-[#1a1a1a]/50 p-3 rounded-[2.5rem] border border-white/10 focus-within:border-primary/40 transition-all shadow-inner">
          <textarea 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder={`Echo as ${currentPersona.name}...`} 
            className="flex-1 bg-transparent border-none focus:outline-none text-white text-base max-h-40 min-h-[28px] py-1.5 px-3 resize-none leading-relaxed font-medium placeholder:text-slate-600" 
            rows={1} 
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
          />
          <button onClick={() => { vibrate(); setIsListening(!isListening); }} className={`p-2.5 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : 'text-slate-500 hover:text-white bg-white/5'}`}><Mic size={22} /></button>
          <button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading} 
            className={`p-3.5 rounded-[1.4rem] transition-all ${input.trim() ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 active:scale-95' : 'bg-white/5 text-slate-700'}`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showChatMenu && (
        <div className="fixed inset-0 z-30 flex items-start justify-end p-6 pt-24" onClick={() => setShowChatMenu(false)}>
            <div className="w-64 bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setIsViewingSettings(true); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-6 py-5 hover:bg-white/5 flex items-center gap-4 text-xs font-black uppercase tracking-widest border-b border-white/5 text-white">
                  {isOwner ? <Settings size={18} /> : <Eye size={18} />} 
                  {isOwner ? 'Edit Identity' : 'View Identity'}
                </button>
                <button onClick={() => { setShowMemoryManager(true); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-6 py-5 hover:bg-white/5 flex items-center gap-4 text-xs font-black uppercase tracking-widest border-b border-white/5 text-white"><FileText size={18} /> Manage Memory</button>
                <button onClick={() => { setShowMemorySelector(true); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-6 py-5 hover:bg-white/5 flex items-center gap-4 text-xs font-black uppercase tracking-widest border-b border-white/5 text-white"><BrainCircuit size={18} /> Select to Etch</button>
                <button onClick={() => { if(confirm('Obliterate history?')) onUpdateSession({...session, messages: []}); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-6 py-5 hover:bg-white/5 flex items-center gap-4 text-xs font-black uppercase tracking-widest text-red-500"><Trash2 size={18} /> Terminate Chat</button>
            </div>
        </div>
      )}

      {isViewingSettings && (
        <CharacterEditor 
          mode="edit" 
          initialData={character} 
          userProfile={userProfile}
          onSave={(data) => { if (isOwner) { onUpdateCharacter(data); setIsViewingSettings(false); } }} 
          onCancel={() => setIsViewingSettings(false)} 
        />
      )}

      {/* Memory Manager Modal */}
      {showMemoryManager && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
           <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-[3.5rem] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">Permanent Legacy</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Core Narrative Nodes</p>
                </div>
                <button onClick={() => setShowMemoryManager(false)} className="text-slate-500 bg-white/5 p-2 rounded-full hover:text-white transition-all"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Memory Data</label>
                  <button 
                    onClick={consolidateMemory} 
                    disabled={!character.memory || isConsolidating}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isConsolidating ? 'bg-primary/50 text-white animate-pulse' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white'}`}
                  >
                    {isConsolidating ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />} Consolidate
                  </button>
                </div>
                <textarea 
                  value={character.memory || ""} 
                  onChange={e => onUpdateCharacter({ memory: e.target.value })}
                  placeholder="No narrative nodes etched yet..."
                  className="w-full bg-[#121212] border border-white/5 rounded-3xl p-6 text-white font-mono text-xs leading-relaxed h-[400px] outline-none shadow-inner focus:border-primary/30 transition-all resize-none"
                />
                <p className="text-[9px] text-slate-600 font-medium px-1 mt-4 italic uppercase tracking-widest">
                  Consolidation uses AI to remove redundancies and structure history for optimal context injection.
                </p>
              </div>

              <div className="p-8 border-t border-white/5 flex gap-4 bg-[#1a1a1a]/50">
                <button 
                  onClick={() => setShowMemoryManager(false)} 
                  className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs active:scale-95 transition-all"
                >
                  Commit Legacy
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Legacy overlays (Persona, Memory Selection) */}
      {showPersonaMenu && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex items-end justify-center animate-in fade-in duration-300">
           <div className="absolute inset-0" onClick={() => setShowPersonaMenu(false)}></div>
           <div className="bg-[#121212] w-full max-h-[85%] rounded-t-[3.5rem] border-t border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom-20">
              <div className="p-10 border-b border-white/5 flex items-center justify-between"><div><h3 className="text-2xl font-black uppercase tracking-tighter text-white">Manifestation</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Select Active Avatar</p></div><button onClick={() => setShowPersonaMenu(false)} className="p-3 text-slate-500 bg-white/5 rounded-full"><X size={24} /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {personas.map((p: any) => (
                  <button key={p.id} onClick={() => { vibrate(); setPendingPersona(p); }} className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 ${activePersonaId === p.id ? "bg-primary border-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-[#1a1a1a] border-white/5"}`}>
                    <div className={`w-14 h-14 ${p.avatarColor} rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl ring-1 ring-white/10`}>{p.name[0]}</div>
                    <div className="flex-1 min-w-0"><h4 className="font-black text-lg text-white truncate tracking-tight">{p.name}</h4><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate opacity-60">{p.bio}</p></div>
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}
      
      {/* Pending persona confirmation modal */}
      {pendingPersona && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-8 animate-in fade-in">
          <div className="bg-[#1a1a1a] w-full max-w-xs p-10 rounded-[3rem] shadow-2xl border border-white/10 text-center">
            <h4 className="text-xl font-black mb-2 uppercase tracking-tighter text-white">Manifest?</h4>
            <div className="space-y-3">
              <button onClick={() => { setActivePersonaId(pendingPersona.id); setPendingPersona(null); setShowPersonaMenu(false); vibrate(); }} className="w-full bg-primary py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">Morph Now</button>
              <button onClick={() => setPendingPersona(null)} className="w-full bg-darker py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] text-slate-500">Abort</button>
            </div>
          </div>
        </div>
      )}

      {/* Memory selector */}
      {showMemorySelector && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300">
           <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 flex-none">
              <button onClick={() => { setShowMemorySelector(false); setSelectedMsgIds(new Set()); }} className="text-slate-500 p-2"><X size={28} /></button>
              <h3 className="text-base font-black uppercase tracking-widest text-white">Etch Legacy Nodes</h3>
              <button onClick={generateMemoryFromSelection} disabled={selectedMsgIds.size === 0 || isSyncingMemory} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedMsgIds.size > 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-700'}`}>{isSyncingMemory ? <RefreshCw className="animate-spin" size={14} /> : 'Process'}</button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {session.messages.filter((m: any) => m.role !== 'system').map((msg: any) => (
                <div key={msg.id} onClick={() => { vibrate(); const n = new Set(selectedMsgIds); if (n.has(msg.id)) n.delete(msg.id); else n.add(msg.id); setSelectedMsgIds(n); }} className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex gap-4 ${selectedMsgIds.has(msg.id) ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' : 'bg-[#1a1a1a]/30 border-white/5'}`}>
                   <div className="mt-1">{selectedMsgIds.has(msg.id) ? <CheckSquare size={22} className="text-primary" /> : <Square size={22} className="text-slate-700" />}</div>
                   <div className="flex-1 min-w-0"><div className="text-[9px] font-black uppercase text-slate-600 mb-1 tracking-widest">{msg.role === 'user' ? 'Input' : character.name}</div><p className="text-sm font-medium line-clamp-3 text-slate-200">{msg.text}</p></div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Intermediate Memory Editor (After selection) */}
      {showMemoryEditor && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
           <div className="bg-[#1a1a1a] w-full max-w-lg rounded-[3.5rem] border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between"><h3 className="text-xl font-black uppercase tracking-tighter text-white">Processed Nodes</h3><button onClick={() => setShowMemoryEditor(false)} className="text-slate-500"><X size={24} /></button></div>
              <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
                <textarea 
                  value={generatedMemory} 
                  onChange={e => setGeneratedMemory(e.target.value)} 
                  className="w-full bg-[#121212] border border-white/5 rounded-3xl p-6 text-white font-medium text-sm leading-relaxed h-[400px] outline-none shadow-inner" 
                />
              </div>
              <div className="p-10 border-t border-white/5 flex gap-4 bg-[#1a1a1a]/50">
                <button onClick={() => setShowMemoryEditor(false)} className="flex-1 bg-darker py-5 rounded-[1.5rem] font-