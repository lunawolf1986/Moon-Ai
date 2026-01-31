
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
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
  AlignLeft,
  Brain,
  Trash,
  UserPlus,
  Volume2,
  ChevronLeftCircle,
  ChevronRightCircle,
  Dices,
  Layers
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

const vibrate = (ms: number = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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

const CharacterCard: React.FC<{ character: Character, onStartChat: (id: string) => void }> = ({ character, onStartChat }) => (
  <div className="bg-[#1a1a1a] rounded-3xl p-3 shadow-xl border border-white/5 flex flex-col gap-2 hover:border-primary/40 transition-all group active:scale-[0.98]">
    <div className="flex items-start justify-between">
      <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="md" initial={character.initial} />
      <button onClick={() => onStartChat(character.id)} className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Chat</button>
    </div>
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <h3 className="font-black text-base text-white group-hover:text-primary transition-colors">{character.name}</h3>
        {character.maturityLevel === 'unrestricted' && <span className="text-[7px] font-black bg-purple-600/30 text-purple-200 px-1 py-0.5 rounded border border-purple-500/30">X</span>}
      </div>
      {character.subtitle && <p className="text-primary/70 text-[9px] font-black uppercase tracking-widest mb-0.5 italic">{character.subtitle}</p>}
      <p className="text-slate-400 text-[11px] line-clamp-2 font-medium leading-tight">{character.tagline}</p>
    </div>
    <div className="flex items-center text-[8px] text-slate-500 mt-auto pt-2 border-t border-white/5 uppercase font-bold tracking-widest">
      <span className="text-slate-400">{character.creator}</span>
      <span className="mx-1.5 opacity-30">•</span>
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

  const clearAllData = () => {
    if (confirm("Are you sure? This will reset all characters, personas, and chats to default.")) {
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
    
    if (editingCharacterId) {
       const char = characters.find(c => c.id === editingCharacterId);
       if (char) {
         return <CharacterEditor 
           mode="edit" 
           initialData={char} 
           userProfile={userProfile} 
           onSave={(data) => {
             setCharacters(prev => prev.map(c => c.id === editingCharacterId ? { ...c, ...data } : c));
             setEditingCharacterId(null);
             setAppToast("Core Updated");
           }} 
           onCancel={() => setEditingCharacterId(null)} 
         />;
       }
    }

    switch (activeTab) {
      case "for_you": return <ForYouView characters={characters} onStartChat={startChat} />;
      case "featured": return <FeaturedView characters={characters} onStartChat={startChat} />;
      case "explore": return <ExploreView characters={characters} onStartChat={startChat} />;
      case "chat": return <ChatListView chats={chats} characters={characters} onOpenChat={setActiveChatId} onDeleteChat={(id: string) => setChats(chats.filter(c => c.id !== id))} />;
      case "create": return <CreateView initialMode={createViewMode} userProfile={userProfile} onCreateCharacter={(c: any) => { setCharacters([c, ...characters]); setAppToast("Identity Manifested"); setActiveTab("library"); }} onCreatePersona={(p: any) => { setPersonas([p, ...personas]); setAppToast("Persona Formed"); setActiveTab("profile"); }} onBack={() => setActiveTab('for_you')} />;
      case "library": return <LibraryView characters={characters} personas={personas} userProfile={userProfile} onEditCharacter={(c: Character) => setEditingCharacterId(c.id)} />;
      case "profile": return <ProfileView personas={personas} activePersonaId={activePersonaId} setActivePersonaId={(id: string) => { setActivePersonaId(id); const p = personas.find(pers => pers.id === id); if (p) setAppToast(`Manifested: ${p.name}`); }} chats={chats} updatePersona={(p: Persona) => setPersonas(prev => prev.map(o => o.id === p.id ? p : o))} userProfile={userProfile} setUserProfile={setUserProfile} onDeletePersona={(id: string) => setPersonas(personas.filter(p => p.id !== id))} />;
      case "settings": return <SettingsView onClearData={clearAllData} userProfile={userProfile} />;
      default: return <ForYouView characters={characters} onStartChat={startChat} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#e0e0e0] font-sans overflow-hidden">
      {!activeChatId && !editingCharacterId && (
        <div className="h-14 px-4 border-b border-white/5 flex items-center justify-between bg-[#121212]/80 backdrop-blur-xl z-50">
          <div className="flex items-center gap-2">
             <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">M</div>
             <h1 className="text-lg font-black tracking-tighter uppercase text-white">Moonai</h1>
          </div>
          <button className="p-2 text-slate-500 hover:text-white transition-colors"><Search size={18} /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar relative">{renderTabContent()}</div>
      
      {appToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 animate-in slide-in-from-top-4 duration-300">
          <Check size={12} /> {appToast}
        </div>
      )}
      
      {!activeChatId && !editingCharacterId && (
        <div className="h-16 bg-[#1a1a1a]/90 backdrop-blur-md border-t border-white/5 flex-none z-50">
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center h-full overflow-x-auto no-scrollbar px-4 space-x-0.5">
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

const ForYouView = ({ characters, onStartChat }: { characters: Character[], onStartChat: (id: string) => void }) => (
  <div className="max-w-6xl mx-auto p-4 pb-20 space-y-6">
    <header className="mt-2 mb-1">
      <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-white to-blue-300 tracking-tighter">Ready for more?</h1>
      <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1 opacity-60 italic">Echo through the multiverse</p>
    </header>
    <section>
      <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-1.5"><Zap size={12} className="fill-primary" /> Pick of the day</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{characters.slice(0, 2).map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
    </section>
    <section>
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">Recent Additions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{characters.slice(2).map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
    </section>
  </div>
);

const FeaturedView = ({ characters, onStartChat }: { characters: Character[], onStartChat: (id: string) => void }) => (
  <div className="max-w-6xl mx-auto p-4 pb-20">
    <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter text-white">Originals</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{characters.map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />)}</div>
  </div>
);

const ExploreView = ({ characters, onStartChat }: { characters: Character[], onStartChat: (id: string) => void }) => {
  const [search, setSearch] = useState("");
  const filtered = characters.filter((c: Character) => (search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))));
  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      <div className="relative mb-6 max-w-2xl mx-auto">
        <Search className="absolute left-3.5 top-3.5 text-slate-600" size={16} />
        <input type="text" placeholder="Search identities..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white text-sm font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-600 shadow-inner" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.length > 0 ? filtered.map((c: Character) => <CharacterCard key={c.id} character={c} onStartChat={onStartChat} />) : <div className="flex flex-col items-center justify-center py-20 opacity-20"><Search size={40} /><p className="font-bold text-xs mt-2">No results found.</p></div>}</div>
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
  const [seed, setSeed] = useState(initialData.seed || Math.floor(Math.random() * 1000));
  const [color, setColor] = useState(initialData.color || "bg-blue-600");
  
  const isEditable = mode === "create" || initialData.creator === userProfile.handle;

  const THEME_COLORS = [
    "bg-red-600", "bg-orange-600", "bg-amber-600", "bg-yellow-600", 
    "bg-lime-600", "bg-green-600", "bg-emerald-600", "bg-teal-600",
    "bg-cyan-600", "bg-sky-600", "bg-blue-600", "bg-indigo-600",
    "bg-violet-600", "bg-purple-600", "bg-fuchsia-600", "bg-pink-600",
    "bg-rose-600", "bg-slate-700", "bg-stone-700", "bg-zinc-800"
  ];

  const generateNewAvatar = () => {
    vibrate(15);
    setSeed(Math.floor(Math.random() * 10000));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#121212] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-sans">
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#121212]/50 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-slate-400 p-2 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-xs font-black uppercase tracking-[0.1em] text-white/90">{mode === 'create' ? 'Manifest Identity' : 'Core Matrix'}</span>
        </div>
        {isEditable && (
          <button onClick={() => { vibrate(); onSave({ name, tagline, subtitle, description, greeting, systemInstruction, memory, visibility, maturityLevel: maturity, seed, color }); }} className="bg-primary text-white font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all">Save</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 p-4 space-y-8 max-w-xl mx-auto w-full">
        <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative group">
              <AbstractAvatar name={name || "New"} colorClass={color} size="xl" initial={name ? name[0] : "?"} seed={seed} />
              <button onClick={generateNewAvatar} className="absolute -bottom-1 -right-1 bg-[#1a1a1a] border border-white/10 p-2 rounded-full shadow-xl hover:bg-white/10 text-primary transition-all active:scale-90"><Dices size={14}/></button>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">{name || "Unnamed Entity"}</h2>
              
              <div className="mt-4 w-full flex flex-wrap justify-center gap-1.5 max-w-[240px]">
                {THEME_COLORS.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border border-white/10 transition-transform ${c} ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#121212] scale-110' : 'hover:scale-110'}`}
                  />
                ))}
              </div>
            </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Manifestation Profile</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Display Name</label>
                <input readOnly={!isEditable} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tony Stark" className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-primary/30 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Short Tagline</label>
                <input readOnly={!isEditable} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short catchphrase..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-primary/30 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Sub-Role</label>
                <input readOnly={!isEditable} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. Iron Man" className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-primary/30 transition-all" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Neural Directives</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Public Bio</label>
                <textarea readOnly={!isEditable} value={description} onChange={e => setDescription(e.target.value)} placeholder="What everyone knows..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white h-24 outline-none focus:border-primary/30 transition-all resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Core Persona Logic (Hidden)</label>
                <textarea readOnly={!isEditable} value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} placeholder="Rules, personality, secret lore..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-white h-40 outline-none font-mono text-[11px] focus:border-primary/30 transition-all resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Inbound Greeting</label>
                <textarea readOnly={!isEditable} value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Initial contact message..." className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white h-24 outline-none focus:border-primary/30 transition-all resize-none" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Protocols</h3>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Visibility</label>
                 <select disabled={!isEditable} value={visibility} onChange={e => setVisibility(e.target.value as any)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white font-bold outline-none appearance-none">
                   <option value="public">Public</option>
                   <option value="private">Private</option>
                 </select>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Filters</label>
                 <select disabled={!isEditable} value={maturity} onChange={e => setMaturity(e.target.value as any)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-sm text-white font-bold outline-none appearance-none">
                   <option value="everyone">Everyone</option>
                   <option value="teen">Teen</option>
                   <option value="mature">Mature</option>
                   <option value="unrestricted">Unrestricted</option>
                 </select>
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const CreateView = ({ onCreateCharacter, onCreatePersona, onBack, initialMode, userProfile }: any) => {
  const [mode, setMode] = useState<"character" | "persona">(initialMode || "character");
  const [personaName, setPersonaName] = useState("");
  const [personaBio, setPersonaBio] = useState("");

  return (
    <div className="flex flex-col h-full bg-[#121212] animate-in fade-in duration-300">
      <div className="px-4 pt-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tighter">Laboratory</h1>
        <button onClick={onBack} className="p-2 text-slate-600 hover:text-white"><X size={18}/></button>
      </div>

      <div className="flex bg-[#1a1a1a] p-1 rounded-xl mx-4 mb-6 border border-white/10 shadow-inner">
        <button onClick={() => setMode("character")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'character' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Character</button>
        <button onClick={() => setMode("persona")} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'persona' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Persona</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {mode === 'character' ? (
          <CharacterEditor 
            mode="create" 
            userProfile={userProfile} 
            initialData={{ creator: userProfile.handle }} 
            onCancel={onBack} 
            onSave={(data) => onCreateCharacter({ id: `char_${Date.now()}`, initial: data.name![0].toUpperCase(), color: 'bg-indigo-600', creator: userProfile.handle, engagement: "0", tags: [], ...data })} 
          />
        ) : (
          <div className="px-4 pb-20 space-y-4 max-w-lg mx-auto w-full">
            <div className="space-y-1.5">
               <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Persona Name</label>
               <input value={personaName} onChange={e => setPersonaName(e.target.value)} placeholder="Identify yourself..." className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50 transition-all" />
            </div>
            <div className="space-y-1.5">
               <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Manifest Memory</label>
               <textarea value={personaBio} onChange={e => setPersonaBio(e.target.value)} placeholder="Describe your essence in this dialogue..." className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-sm text-white h-32 outline-none resize-none focus:border-primary/50 transition-all" />
            </div>
            <button 
              onClick={() => { 
                vibrate(); 
                onCreatePersona({ 
                  id: `p_${Date.now()}`, 
                  name: personaName, 
                  bio: personaBio, 
                  traits: [], 
                  isPrivate: true, 
                  avatarColor: "bg-blue-600" 
                }); 
                setPersonaName("");
                setPersonaBio("");
              }} 
              disabled={!personaName.trim()} 
              className="w-full bg-primary text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
            >
              Anchor Persona
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LibraryView = ({ characters, personas, userProfile, onEditCharacter }: any) => (
  <div className="p-4 max-w-4xl mx-auto w-full pb-20">
    <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter">Collection</h1>
    
    <div className="space-y-8">
      <section>
        <h2 className="text-[9px] font-black text-slate-600 uppercase mb-3 tracking-widest flex items-center gap-1.5 px-1">Synthetics</h2>
        <div className="space-y-2">
          {characters.filter((c:any) => c.creator === userProfile.handle).map((c:any) => (
            <div key={c.id} className="bg-[#1a1a1a] p-3 rounded-2xl flex items-center justify-between group border border-white/5 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <AbstractAvatar name={c.name} colorClass={c.color} seed={c.seed} size="sm" initial={c.initial}/>
                <div>
                  <div className="font-bold text-sm text-white leading-tight">{c.name}</div>
                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{c.visibility}</div>
                </div>
              </div>
              <button onClick={() => onEditCharacter(c)} className="p-2 text-slate-600 hover:text-white transition-colors"><Pencil size={16} /></button>
            </div>
          ))}
          {characters.filter((c:any) => c.creator === userProfile.handle).length === 0 && (
            <div className="py-8 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest">Empty Array</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[9px] font-black text-slate-600 uppercase mb-3 tracking-widest px-1">Manifestations</h2>
        <div className="space-y-2">
          {personas.filter((p:any) => p.id !== 'p_default').map((p:any) => (
            <div key={p.id} className="bg-[#1a1a1a]/50 p-3 rounded-2xl flex items-center gap-3 border border-white/5">
              <div className={`w-8 h-8 ${p.avatarColor} rounded-full flex items-center justify-center font-black text-xs text-white`}>{p.name[0]}</div>
              <div className="flex-1">
                <div className="font-bold text-sm text-white leading-tight">{p.name}</div>
                <div className="text-[9px] text-slate-500 truncate max-w-[160px]">{p.bio}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const ProfileView = ({ personas, activePersonaId, setActivePersonaId, userProfile, setUserProfile, onDeletePersona, updatePersona }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userProfile.name);
  const [editedHandle, setEditedHandle] = useState(userProfile.handle);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const saveProfile = () => {
    setUserProfile({ ...userProfile, name: editedName, handle: editedHandle, avatarInitial: editedName[0].toUpperCase() });
    setIsEditing(false);
    vibrate();
  };

  const savePersona = () => {
    if (editingPersona) {
      updatePersona(editingPersona);
      setEditingPersona(null);
      vibrate();
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto w-full pb-24">
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <div className="w-20 h-20 bg-primary rounded-[1.8rem] flex items-center justify-center text-3xl font-black mb-3 shadow-2xl shadow-primary/30 group-hover:scale-105 transition-transform">{userProfile.avatarInitial}</div>
          <button onClick={() => setIsEditing(!isEditing)} className="absolute bottom-2 right-0 bg-[#1a1a1a] border border-white/10 p-1.5 rounded-full shadow-xl hover:bg-white/10 text-primary transition-all"><Pencil size={12} /></button>
        </div>
        
        {isEditing ? (
          <div className="w-full space-y-3 mt-2 animate-in slide-in-from-top-4">
             <input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Display Name" className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-center font-black text-sm outline-none focus:border-primary/40 transition-all" />
             <input value={editedHandle} onChange={e => setEditedHandle(e.target.value)} placeholder="@handle" className="w-full bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-center font-bold text-xs text-slate-500 outline-none focus:border-primary/40 transition-all" />
             <div className="flex gap-2">
               <button onClick={() => setIsEditing(false)} className="flex-1 bg-white/5 text-slate-500 font-black py-3 rounded-xl uppercase tracking-widest text-[9px]">Cancel</button>
               <button onClick={saveProfile} className="flex-1 bg-primary text-white font-black py-3 rounded-xl uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20">Save</button>
             </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tighter text-white">{userProfile.name}</h1>
            <div className="text-slate-600 font-bold uppercase tracking-widest text-[9px] mt-0.5">{userProfile.handle}</div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Active Resonance</h2>
            <div className="text-[8px] font-black text-primary uppercase">{personas.length} linked</div>
          </div>
          <div className="space-y-3">
            {personas.map((p: any) => (
              <div key={p.id} className="relative group">
                <button 
                  onClick={() => setActivePersonaId(p.id)} 
                  className={`w-full p-4 rounded-[1.8rem] text-left transition-all border-2 relative overflow-hidden ${activePersonaId === p.id ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' : 'bg-[#1a1a1a] border-white/5 text-slate-500 hover:border-white/10'}`}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base leading-tight">{p.name}</div>
                      <div className="text-[10px] opacity-60 truncate leading-relaxed mt-0.5">{p.bio}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {activePersonaId === p.id && <Check size={16} className="text-white" />}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingPersona(p); vibrate(); }}
                        className={`p-1.5 rounded-full transition-colors ${activePersonaId === p.id ? 'hover:bg-white/20' : 'hover:bg-white/10'}`}
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </div>
                </button>
                {p.id !== 'p_default' && !isEditing && (
                  <button onClick={() => onDeletePersona(p.id)} className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {editingPersona && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[2.5rem] border border-white/10 p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-black uppercase tracking-tighter text-white">Refine Essence</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Anchor Name</label>
                  <input value={editingPersona.name} onChange={e => setEditingPersona({...editingPersona, name: e.target.value})} className="w-full bg-[#121212] border border-white/5 p-3 rounded-xl text-sm text-white font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-700 uppercase ml-2">Manifest Memory</label>
                  <textarea value={editingPersona.bio} onChange={e => setEditingPersona({...editingPersona, bio: e.target.value})} className="w-full bg-[#121212] border border-white/5 p-3 rounded-xl text-sm text-white h-28 outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingPersona(null)} className="flex-1 py-3 text-slate-600 font-black uppercase text-[9px]">Abort</button>
                <button onClick={savePersona} className="flex-1 bg-primary text-white py-3 rounded-xl font-black uppercase text-[9px] shadow-lg shadow-primary/20 active:scale-95 transition-all">Update</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ onClearData, userProfile }: any) => {
  const [analytics, setAnalytics] = useState(true);
  const [haptics, setHaptics] = useState(true);

  return (
    <div className="p-4 max-w-lg mx-auto w-full pb-24">
      <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter">Core Settings</h1>
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-[9px] font-black text-slate-700 uppercase tracking-widest px-1">Neural Directives</h2>
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5">
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Shield size={16}/></div>
                <div>
                  <div className="font-black text-xs">Strict Logic</div>
                  <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Force character persistence</div>
                </div>
              </div>
              <button onClick={() => setAnalytics(!analytics)} className={`w-10 h-5 rounded-full relative transition-colors ${analytics ? 'bg-primary' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${analytics ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><Zap size={16}/></div>
                <div>
                  <div className="font-black text-xs">Tactile Feed</div>
                  <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Haptic pulse on echos</div>
                </div>
              </div>
              <button onClick={() => setHaptics(!haptics)} className={`w-10 h-5 rounded-full relative transition-colors ${haptics ? 'bg-primary' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${haptics ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </section>
        <section className="space-y-3 text-center pb-8">
          <div className="w-10 h-10 bg-primary/20 text-primary mx-auto rounded-xl flex items-center justify-center font-black text-lg mb-2">M</div>
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Moonai v2.6.5 (Manifest)</p>
          <button onClick={onClearData} className="mt-8 text-red-500/50 hover:text-red-500 text-[8px] font-black uppercase tracking-[0.2em] transition-colors">Emergency Purge</button>
        </section>
      </div>
    </div>
  );
};

// --- MAIN CHAT INTERFACE ---

const ChatInterface = ({ session, character, personas, activePersonaId, setActivePersonaId, onBack, onUpdateSession, onUpdateCharacter, userProfile, setAppToast }: any) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showPersonaShift, setShowPersonaShift] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [session.messages, loading]);

  const getEnhancedSystemPrompt = (char: Character, persona: Persona) => {
    let base = `Identity: ${char.name}\nLore: ${char.description}\nCore Persona Directives: ${char.systemInstruction}\n`;
    if (char.memory) base += `\nPERMANENT MEMORY:\n${char.memory}`;
    
    base += `\n\nSTRICT ROLEPLAY RULES:
1. Actions MUST be enclosed in asterisks (e.g., *leans back in his chair*).
2. Dialogue MUST be prefixed with '${char.name}:'.
3. Stay strictly in character. Never acknowledge being an AI or a language model.
4. User Persona Context: ${persona.name} - ${persona.bio}
5. RESPONSE SPEED IS PARAMOUNT. Be concise but descriptive.`;

    if (char.maturityLevel === 'mature' || char.maturityLevel === 'unrestricted') {
      base += `\n\nADVANCED ROLEPLAY PROTOCOL (Active):
- Use visceral, multi-sensory descriptions (sights, sounds, subtle textures, scents).
- Explore deep psychological states and emotional subtext.
- Actions should be evocative and pacing.
- Embrace raw, complex, and emotionally resonant scenarios.
- Ensure descriptions of interaction are detailed and immersive.`;
    }

    return base;
  };

  const playVoice = async (msgId: string, text: string) => {
    if (isSpeaking === msgId) return;
    vibrate(10);
    setIsSpeaking(msgId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this naturally in character: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: character.id.includes('tony') ? 'Puck' : 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const ctx = audioCtxRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
      } else {
        setIsSpeaking(null);
      }
    } catch (e) {
      console.error(e);
      setIsSpeaking(null);
    }
  };

  const regenerateMessage = async (msgId: string) => {
    vibrate(20);
    const msgToReplace = session.messages.find((m:any) => m.id === msgId);
    if (!msgToReplace) return;

    const existingVersions = msgToReplace.versions || [msgToReplace.text];
    if (existingVersions.length >= 100) {
      setAppToast?.("Maximum alternatives (100) reached.");
      return;
    }

    setLoading(true);
    const msgIndex = session.messages.findIndex((m:any) => m.id === msgId);
    const contextHistory = session.messages.slice(0, msgIndex);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentPersona = personas.find((p: any) => p.id === activePersonaId) || personas[0];
      const systemPrompt = getEnhancedSystemPrompt(character, currentPersona);
      
      const history = contextHistory.map((m: any) => ({ role: m.role as any, parts: [{ text: m.text }] }));
      
      // Increased diversity for variants
      const temperature = 1.0 + (existingVersions.length * 0.01);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: history,
        config: { 
          systemInstruction: systemPrompt, 
          temperature: temperature,
          thinkingConfig: { thinkingBudget: character.maturityLevel === 'unrestricted' ? 8000 : 2000 }
        }
      });

      const newText = response.text || "Neural void...";
      const newVersions = [...existingVersions, newText];
      
      const updatedMessages = session.messages.map((m: any) => 
        m.id === msgId ? { ...m, text: newText, versions: newVersions, currentVersionIndex: newVersions.length - 1 } : m
      );

      onUpdateSession({ ...session, messages: updatedMessages, lastActive: Date.now() });
    } catch (e) {
      console.error(e);
      setAppToast?.("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const switchVersion = (msgId: string, direction: 'prev' | 'next') => {
    const msg = session.messages.find((m:any) => m.id === msgId);
    if (!msg || !msg.versions) return;
    vibrate(5);
    const currentIndex = msg.currentVersionIndex ?? 0;
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= msg.versions.length) nextIndex = msg.versions.length - 1;

    const updatedMessages = session.messages.map((m: any) => 
      m.id === msgId ? { ...m, text: m.versions[nextIndex], currentVersionIndex: nextIndex } : m
    );
    onUpdateSession({ ...session, messages: updatedMessages });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    vibrate();
    const modelMsgId = `msg_${Date.now()}_m`;
    const newMessages = [...session.messages, 
      { id: `msg_${Date.now()}_u`, role: "user", text: input, personaId: activePersonaId, timestamp: Date.now() }, 
      { id: modelMsgId, role: "model", text: "", timestamp: Date.now(), isGenerating: true, versions: [], currentVersionIndex: 0 }
    ];
    onUpdateSession({ ...session, messages: newMessages, lastActive: Date.now() });
    setInput("");
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentPersona = personas.find((p: any) => p.id === activePersonaId) || personas[0];
      const systemPrompt = getEnhancedSystemPrompt(character, currentPersona);
      
      const history = newMessages.filter(m => !m.isGenerating).map(m => ({ role: m.role as any, parts: [{ text: m.text }] }));
      
      const response = await ai.models.generateContentStream({ 
        model: "gemini-3-flash-preview", 
        contents: history,
        config: { 
          systemInstruction: systemPrompt, 
          temperature: 0.95,
          thinkingConfig: { thinkingBudget: character.maturityLevel === 'unrestricted' ? 8000 : 2000 }
        }
      });

      let fullText = "";
      for await (const chunk of response) { 
        if (chunk.text) { 
          fullText += chunk.text; 
          onUpdateSession({ ...session, messages: newMessages.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m) }); 
        } 
      }
      onUpdateSession({ ...session, messages: newMessages.map(m => m.id === modelMsgId ? { ...m, text: fullText, isGenerating: false, versions: [fullText], currentVersionIndex: 0 } : m) });
    } catch (e) { 
      console.error(e);
      setAppToast?.("Neural disconnect.");
    } finally { 
      setLoading(false); 
    }
  };

  const characterColorHex = character.color === 'bg-red-600' ? '#ef4444' : 
                          character.color === 'bg-slate-800' ? '#1e293b' : 
                          character.color === 'bg-blue-500' ? '#3b82f6' : 
                          character.color === 'bg-stone-600' ? '#57534e' : '#6366f1';

  return (
    <div className="flex flex-col h-full bg-[#121212] relative overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none opacity-15 transition-all duration-1000"
        style={{ background: `radial-gradient(circle at 50% 20%, ${characterColorHex} 0%, transparent 70%)` }}
      />

      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#121212]/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
          <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="md" initial={character.initial} />
          <div>
            <div className="font-black text-white flex items-center gap-1.5 uppercase text-sm tracking-tighter">
              {character.name} 
              <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-0.5"><MoreVertical size={14} className="text-slate-700" /></button>
            </div>
            <div className="text-[8px] text-primary font-black uppercase tracking-widest">{loading ? 'Typing...' : 'Active'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24 z-10" ref={scrollRef}>
        <div className="max-w-4xl mx-auto w-full space-y-8">
          {session.messages.map((msg: any) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[92%] gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'model' && <AbstractAvatar name={character.name} colorClass={character.color} seed={character.seed} size="sm" initial={character.initial} className="mt-1" />}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                   <div className="flex items-center gap-1.5 mb-0.5 px-1.5">
                      <span className="text-[8px] font-black text-slate-600 uppercase">
                        {msg.role === 'user' ? (personas.find((p: any) => p.id === msg.personaId)?.name || 'You') : character.name}
                      </span>
                   </div>
                   
                   <div className={`group relative px-4 py-3 rounded-[1.8rem] text-[14.5px] shadow-xl transition-all ${
                     msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 
                     (msg.role === 'system' ? 'bg-white/5 border border-white/10 text-slate-600 rounded-xl italic text-[11px]' : 
                     'bg-[#1a1a1a]/80 backdrop-blur-md text-slate-200 border border-white/5 rounded-tl-none')}`}>
                      
                      {msg.text.split('\n').map((l:any, i:any) => (
                        <p key={i} className={`mb-1.5 last:mb-0 leading-relaxed ${l.startsWith('*') ? 'text-slate-500 italic font-medium' : ''}`}>
                          {l}
                        </p>
                      ))}

                      {msg.isGenerating && <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse rounded-full" />}

                      {msg.role === 'model' && !msg.isGenerating && (
                        <div className="absolute -bottom-7 left-0 flex items-center gap-2 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                           <button onClick={() => playVoice(msg.id, msg.text)} className={`p-1 rounded-full hover:bg-white/10 ${isSpeaking === msg.id ? 'text-primary animate-pulse' : 'text-slate-700'}`}>
                             <Volume2 size={12} />
                           </button>
                           <button onClick={() => regenerateMessage(msg.id)} className="p-1 rounded-full hover:bg-white/10 text-slate-700" title="Generate alternate (up to 100)">
                             <RefreshCw size={12} />
                           </button>
                           {msg.versions && msg.versions.length > 1 && (
                             <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase bg-[#1a1a1a]/60 px-2 py-0.5 rounded-full border border-white/5">
                               <button onClick={() => switchVersion(msg.id, 'prev')} className="hover:text-white transition-colors disabled:opacity-30" disabled={msg.currentVersionIndex === 0}>
                                 <ChevronLeft size={10}/>
                               </button>
                               <span className="min-w-[30px] text-center tracking-tighter">
                                 { (msg.currentVersionIndex || 0) + 1 } / { msg.versions.length }
                               </span>
                               <button onClick={() => switchVersion(msg.id, 'next')} className="hover:text-white transition-colors disabled:opacity-30" disabled={msg.currentVersionIndex === msg.versions.length - 1}>
                                 <ChevronRight size={10}/>
                               </button>
                             </div>
                           )}
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#121212]/60 backdrop-blur-3xl border-t border-white/5 p-3 pb-8 z-20">
        <div className="max-w-4xl mx-auto w-full flex items-end gap-2 bg-[#1a1a1a]/80 p-2.5 rounded-[2rem] border border-white/10 shadow-xl">
          <textarea 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder={`Echo...`} 
            className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm py-1 px-3 resize-none font-medium leading-relaxed placeholder:text-slate-700" 
            rows={1} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading} 
            className={`p-3 rounded-2xl transition-all ${input.trim() ? 'bg-primary text-white shadow-lg active:scale-95' : 'bg-white/5 text-slate-800'}`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {showChatMenu && (
        <div className="fixed inset-0 z-[110] flex items-start justify-end p-4 pt-20" onClick={() => setShowChatMenu(false)}>
            <div className="w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setShowPersonaShift(true); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase border-b border-white/5 text-primary"><UserPlus size={16} /> Shift Form</button>
                <button onClick={() => { setAppToast?.("Wiping memory..."); onUpdateSession({...session, messages: []}); setShowChatMenu(false); vibrate(); }} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase border-b border-white/5 text-red-500"><History size={16} /> Clear Feed</button>
                <button onClick={() => setShowChatMenu(false)} className="w-full text-left px-5 py-4 hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase text-white"><X size={16} /> Close</button>
            </div>
        </div>
      )}

      {showPersonaShift && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-base font-black uppercase tracking-tighter text-white">Select Resonance</h3>
              </div>
              <div className="max-h-[260px] overflow-y-auto p-3 space-y-2 no-scrollbar">
                {personas.map((p: any) => (
                  <button key={p.id} onClick={() => { setActivePersonaId(p.id); setShowPersonaShift(false); vibrate(15); }}
                    className={`w-full p-4 rounded-xl text-left flex items-center justify-between transition-all ${activePersonaId === p.id ? 'bg-primary text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
                    <div>
                      <div className="font-black text-sm leading-tight">{p.name}</div>
                      <div className="text-[9px] opacity-60 truncate max-w-[140px]">{p.bio}</div>
                    </div>
                    {activePersonaId === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-white/5 text-center">
                <button onClick={() => setShowPersonaShift(false)} className="py-2 text-slate-600 font-black uppercase text-[9px]">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
