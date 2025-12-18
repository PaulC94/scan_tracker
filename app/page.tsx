"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, Trash2, ChevronUp, ChevronDown, X, RefreshCw, Cloud, LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- TES CLÉS SUPABASE (Ne touche à rien ici) ---
const SUPABASE_URL = "https://gqxiofanrgwxzdrhvlro.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_knH1vNOnaHLV9pVllgSsPw_KYtCu7uK";
// ------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Manga {
    id: string;
    title: string;
    current_chapter: string;
    slug: string;
    cover: string;
}

export default function MangaTracker() {
    const [session, setSession] = useState<any>(null);
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // Formulaire
    const [newTitle, setNewTitle] = useState("");
    const [newChapter, setNewChapter] = useState("");
    const FALLBACK_IMAGE = "https://placehold.co/400x600/1e293b/orange?text=No+Cover&font=montserrat";

    // 1. GESTION DE LA SESSION
    useEffect(() => {
        // Vérifie si on est déjà connecté
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
            if (session) fetchMangas();
        });

        // Écoute les changements (connexion / déconnexion)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchMangas();
            else setMangas([]); // Vide l'écran si déconnecté
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`
            },
        });
    };

    // --- LA FONCTION DE DÉCONNEXION ---
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };
    // ----------------------------------

    // 2. FONCTIONS DE LA BASE DE DONNÉES
    const fetchMangas = async () => {
        const { data, error } = await supabase
            .from('mangas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Erreur chargement:', error);
        else setMangas(data || []);
    };

    const addManga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !session) return;

        setIsLoading(true);
        const slug = newTitle.toLowerCase().trim().replace(/\s+/g, '-');
        let coverUrl = FALLBACK_IMAGE;

        try {
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(newTitle)}&limit=1`);
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                coverUrl = data.data[0].images.jpg.large_image_url;
            }
        } catch (error) { console.error("Erreur image", error); }

        const { data, error } = await supabase
            .from('mangas')
            .insert([{ title: newTitle, current_chapter: newChapter || "1", slug: slug, cover: coverUrl }])
            .select();

        if (error) alert("Erreur ajout !");
        else if (data) setMangas([data[0], ...mangas]);

        setNewTitle(""); setNewChapter(""); setIsLoading(false); setIsModalOpen(false);
    };

    const deleteManga = async (id: string) => {
        setMangas(mangas.filter(m => m.id !== id));
        await supabase.from('mangas').delete().eq('id', id);
    };

    const updateChapter = async (id: string, delta: number) => {
        const mangaToUpdate = mangas.find(m => m.id === id);
        if (!mangaToUpdate) return;
        const newChapterVal = Math.max(1, parseInt(mangaToUpdate.current_chapter) + delta).toString();

        setMangas(mangas.map(m => m.id === id ? { ...m, current_chapter: newChapterVal } : m));
        await supabase.from('mangas').update({ current_chapter: newChapterVal }).eq('id', id);
    };

    const openScan = (manga: Manga) => {
        const query = `lecture en ligne scan ${manga.title} chapitre ${manga.current_chapter} vf`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    if (authLoading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;

    // --- ÉCRAN DE LOGIN (Si pas connecté) ---
    if (!session) {
        return (
            <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="bg-[#161b2c]/80 backdrop-blur-xl border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl z-10 text-center">
                    <div className="flex justify-center mb-6"><div className="bg-orange-600/20 p-4 rounded-full"><Cloud className="text-orange-500 w-12 h-12" /></div></div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">SCAN TRACKER</h1>
                    <p className="text-gray-400 mb-8">Connectez-vous pour retrouver vos mangas.</p>
                    <button onClick={handleLogin} className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-transform active:scale-95">
                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Continuer avec Google
                    </button>
                </div>
            </div>
        );
    }

    // --- APPLICATION PRINCIPALE (Si connecté) ---
    return (
        <div className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4">

                {/* Partie Gauche : Infos Utilisateur */}
                <div className="flex items-center gap-4">
                    {session.user?.user_metadata?.avatar_url && (
                        <img
                            src={session.user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full border-2 border-orange-600 shadow-lg shadow-orange-900/20"
                        />
                    )}
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                            HELLO {session.user?.user_metadata?.full_name?.split(' ')[0]} !
                        </h1>
                        <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Cloud size={12} className="text-blue-500" /> Compte Google actif
                        </p>
                    </div>
                </div>

                {/* Partie Droite : Boutons d'action */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full font-bold hover:bg-red-500 hover:text-white transition-all text-sm"
                    >
                        <LogOut size={18} />
                        <span className="hidden md:inline">Déconnexion</span>
                    </button>

                    <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 p-3 rounded-full transition-transform active:scale-90 shadow-xl shadow-orange-900/20">
                        <Plus size={24} />
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto mb-10">
                <input type="text" placeholder="Rechercher..." className="w-full bg-[#161b2c] border-2 border-gray-800 rounded-2xl py-4 px-6 focus:border-orange-500 outline-none text-xl transition-colors" onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {mangas.filter(m => m.title.toLowerCase().includes(search.toLowerCase())).map(manga => (
                    <div key={manga.id} className="bg-[#161b2c] rounded-3xl overflow-hidden border border-gray-800 group hover:border-orange-500/30 transition-all hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col">
                        <div className="relative aspect-[2/3] cursor-pointer overflow-hidden bg-gray-900" onClick={() => openScan(manga)}>
                            <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; e.currentTarget.onerror = null; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent opacity-90" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="font-bold text-lg leading-tight mb-2 text-white drop-shadow-md line-clamp-2">{manga.title}</h3>
                                <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Chapitre {manga.current_chapter}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-[#1c233a] flex justify-between items-center mt-auto">
                            <div className="flex gap-2">
                                <button onClick={(e) => {e.stopPropagation(); updateChapter(manga.id, 1)}} className="p-2 bg-slate-800 hover:bg-orange-600 text-white rounded-xl transition-colors"><ChevronUp size={18}/></button>
                                <button onClick={(e) => {e.stopPropagation(); updateChapter(manga.id, -1)}} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"><ChevronDown size={18}/></button>
                            </div>
                            <button onClick={(e) => {e.stopPropagation(); deleteManga(manga.id)}} className="text-slate-500 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-[#161b2c] border border-gray-700 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-3xl font-black mb-1 text-white">Ajouter</h2>
                        <form onSubmit={addManga} className="space-y-5">
                            <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white transition-all" placeholder="Titre (ex: One Piece)" />
                            <input type="number" value={newChapter} onChange={e => setNewChapter(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white transition-all" placeholder="Chapitre (ex: 1100)" />
                            <button disabled={isLoading} type="submit" className="w-full bg-orange-600 py-4 rounded-xl font-black text-white hover:bg-orange-500 transition-all flex justify-center gap-2">{isLoading ? <RefreshCw className="animate-spin" /> : "SAUVEGARDER"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}