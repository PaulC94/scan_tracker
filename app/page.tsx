"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ChevronUp, ChevronDown, X, RefreshCw, Cloud, LogOut, Loader2, Link as LinkIcon, CheckCircle, BookOpen, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- TES CLÉS SUPABASE ---
const SUPABASE_URL = "https://gqxiofanrgwxzdrhvlro.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_knH1vNOnaHLV9pVllgSsPw_KYtCu7uK";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Manga {
    id: string;
    title: string;
    current_chapter: string;
    slug: string;
    cover: string;
    status: 'reading' | 'completed' | 'plan'; // Nouveau champ
    site_url?: string; // Nouveau champ pour le lien direct
}

export default function MangaTracker() {
    const [session, setSession] = useState<any>(null);
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<'reading' | 'completed' | 'plan'>('reading'); // Filtre actif

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // Formulaire
    const [newTitle, setNewTitle] = useState("");
    const [newChapter, setNewChapter] = useState("");
    const [newUrl, setNewUrl] = useState(""); // Nouveau champ URL

    const FALLBACK_IMAGE = "https://placehold.co/400x600/1e293b/orange?text=No+Cover&font=montserrat";

    // ... (Gestion de session identique à ton code précédent) ...
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
            if (session) fetchMangas();
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchMangas();
            else setMangas([]);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}` }, });
    };
    const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

    // --- CRUD ---
    const fetchMangas = async () => {
        const { data, error } = await supabase.from('mangas').select('*').order('created_at', { ascending: false });
        if (!error) setMangas(data || []);
    };

    const addManga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !session) return;
        setIsLoading(true);

        let coverUrl = FALLBACK_IMAGE;
        try {
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(newTitle)}&limit=1`);
            const data = await response.json();
            if (data.data?.length > 0) coverUrl = data.data[0].images.jpg.large_image_url;
        } catch (error) { console.error("Erreur image", error); }

        const slug = newTitle.toLowerCase().trim().replace(/\s+/g, '-');

        const { data, error } = await supabase
            .from('mangas')
            .insert([{
                title: newTitle,
                current_chapter: newChapter || "1",
                slug: slug,
                cover: coverUrl,
                status: 'reading', // Par défaut
                site_url: newUrl // On sauvegarde l'URL si fournie
            }])
            .select();

        if (data) setMangas([data[0], ...mangas]);

        setNewTitle(""); setNewChapter(""); setNewUrl("");
        setIsLoading(false); setIsModalOpen(false);
    };

    const deleteManga = async (id: string) => {
        if(!window.confirm("Supprimer définitivement ?")) return; // Petite sécurité
        setMangas(mangas.filter(m => m.id !== id));
        await supabase.from('mangas').delete().eq('id', id);
    };

    const updateChapter = async (id: string, delta: number) => {
        const manga = mangas.find(m => m.id === id);
        if (!manga) return;
        const newVal = Math.max(1, parseInt(manga.current_chapter) + delta).toString();
        setMangas(mangas.map(m => m.id === id ? { ...m, current_chapter: newVal } : m));
        await supabase.from('mangas').update({ current_chapter: newVal }).eq('id', id);
    };

    const updateStatus = async (id: string, newStatus: 'reading' | 'completed' | 'plan') => {
        setMangas(mangas.map(m => m.id === id ? { ...m, status: newStatus } : m));
        await supabase.from('mangas').update({ status: newStatus }).eq('id', id);
    };

    // Nouvelle logique d'ouverture
    const openScan = (manga: Manga) => {
        if (manga.site_url) {
            // Si on a un lien direct, on l'utilise.
            // Astuce : on essaie d'être intelligent, si l'URL ne contient pas le chapitre, on l'ajoute ?
            // Pour l'instant on ouvre juste l'URL brute.
            window.open(manga.site_url, '_blank');
        } else {
            // Fallback Google
            const query = `lecture en ligne scan ${manga.title} chapitre ${manga.current_chapter} vf`;
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }
    };

    if (authLoading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;

    if (!session) return ( /* ... Ton code de login existant ... */
        <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-4">
            <button onClick={handleLogin} className="bg-white text-black px-6 py-3 rounded-xl font-bold">Se connecter avec Google</button>
        </div>
    );

    // Filter les mangas selon l'onglet actif
    const filteredMangas = mangas.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) &&
        (m.status === filterStatus || (!m.status && filterStatus === 'reading')) // rétro-compatibilité
    );

    return (

        <div className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
            {/* ... Header existant ... */}
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-white">MANGA TRACKER</h1>
                <div className="flex gap-3">
                    <button onClick={handleLogout} className="text-red-500 font-bold text-sm">Déconnexion</button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 p-3 rounded-full shadow-lg"><Plus size={24} /></button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto mb-8 space-y-6">
                {/* Barre de recherche */}
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-gray-500" />
                    <input type="text" placeholder="Rechercher un titre..." className="w-full bg-[#161b2c] border border-gray-800 rounded-2xl py-4 pl-12 pr-6 focus:border-orange-500 outline-none text-lg transition-colors" onChange={(e) => setSearch(e.target.value)} />
                </div>

                {/* --- NOUVEAU : Onglets de statuts --- */}
                <div className="flex gap-4 border-b border-gray-800 pb-1 overflow-x-auto">
                    {[
                        { id: 'reading', label: 'En cours', icon: BookOpen },
                        { id: 'plan', label: 'À lire', icon: Clock },
                        { id: 'completed', label: 'Terminé', icon: CheckCircle },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${filterStatus === tab.id ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-gray-400 hover:text-white'}`}
                        >
                            <tab.icon size={16} />
                            <span className="font-bold">{tab.label}</span>
                            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full ml-1">
                                {mangas.filter(m => (m.status || 'reading') === tab.id).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Grille de mangas */}
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredMangas.map(manga => (
                    <div key={manga.id} className="bg-[#161b2c] rounded-3xl overflow-hidden border border-gray-800 group hover:border-orange-500/30 transition-all hover:shadow-2xl flex flex-col relative">

                        {/* Indicateur de lien direct */}
                        {manga.site_url && (
                            <div className="absolute top-2 right-2 z-10 bg-blue-600 p-1.5 rounded-full shadow-md" title="Lien direct configuré">
                                <LinkIcon size={12} className="text-white" />
                            </div>
                        )}

                        <div className="relative aspect-[2/3] cursor-pointer overflow-hidden bg-gray-900" onClick={() => openScan(manga)}>
                            <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent opacity-90" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="font-bold text-lg leading-tight mb-1 text-white line-clamp-2">{manga.title}</h3>
                                <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase">Ch. {manga.current_chapter}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-[#1c233a] flex justify-between items-center mt-auto">
                            <div className="flex gap-1">
                                <button onClick={(e) => {e.stopPropagation(); updateChapter(manga.id, 1)}} className="p-2 bg-slate-800 hover:bg-orange-600 text-white rounded-lg"><ChevronUp size={16}/></button>
                                <button onClick={(e) => {e.stopPropagation(); updateChapter(manga.id, -1)}} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"><ChevronDown size={16}/></button>
                            </div>

                            {/* Menu contextuel simplifié (juste suppression pour l'instant) ou Changement statut */}
                            <div className="flex gap-1">
                                {filterStatus === 'reading' && (
                                    <button onClick={() => updateStatus(manga.id, 'completed')} className="text-green-500 hover:bg-green-500/10 p-2 rounded-lg" title="Marquer comme terminé"><CheckCircle size={16}/></button>
                                )}
                                <button onClick={(e) => {e.stopPropagation(); deleteManga(manga.id)}} className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Ajout */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#161b2c] border border-gray-700 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black mb-6 text-white">Nouveau Manga</h2>
                        <form onSubmit={addManga} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 ml-2 uppercase font-bold">Titre</label>
                                <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-3 rounded-xl outline-none focus:border-orange-500 text-white" placeholder="ex: Berserk" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 ml-2 uppercase font-bold">Chapitre</label>
                                    <input type="number" value={newChapter} onChange={e => setNewChapter(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-3 rounded-xl outline-none focus:border-orange-500 text-white" placeholder="1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 ml-2 uppercase font-bold flex items-center gap-1"><LinkIcon size={12}/> Lien direct (Optionnel)</label>
                                <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-3 rounded-xl outline-none focus:border-orange-500 text-white placeholder-gray-600" placeholder="https://..." />
                            </div>

                            <button disabled={isLoading} type="submit" className="w-full bg-orange-600 py-3 mt-2 rounded-xl font-black text-white hover:bg-orange-500 transition-all flex justify-center gap-2">
                                {isLoading ? <RefreshCw className="animate-spin" /> : "AJOUTER"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}