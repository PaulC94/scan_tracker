"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, Trash2, ChevronUp, ChevronDown, X, RefreshCw, Cloud } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- TES CLÉS SUPABASE (Récupérées de ton image) ---
const SUPABASE_URL = "https://gqxiofanrgwxzdrhvlro.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_knH1vNOnaHLV9pVllgSsPw_KYtCu7uK";
// ---------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Manga {
    id: string;
    title: string;
    current_chapter: string; // Nom exact de la colonne dans Supabase
    slug: string;
    cover: string;
}

export default function MangaTracker() {
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Formulaire
    const [newTitle, setNewTitle] = useState("");
    const [newChapter, setNewChapter] = useState("");

    const FALLBACK_IMAGE = "https://placehold.co/400x600/1e293b/orange?text=No+Cover&font=montserrat";

    // 1. CHARGEMENT : On récupère les données du Cloud au démarrage
    useEffect(() => {
        fetchMangas();
    }, []);

    const fetchMangas = async () => {
        const { data, error } = await supabase
            .from('mangas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Erreur de chargement:', error);
        else setMangas(data || []);
    };

    // 2. AJOUT : On envoie vers le Cloud
    const addManga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        setIsLoading(true);
        const slug = newTitle.toLowerCase().trim().replace(/\s+/g, '-');
        let coverUrl = FALLBACK_IMAGE;

        // Récupération image Jikan
        try {
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(newTitle)}&limit=1`);
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                coverUrl = data.data[0].images.jpg.large_image_url;
            }
        } catch (error) {
            console.error("Erreur API Image", error);
        }

        // Insertion Supabase
        const { data, error } = await supabase
            .from('mangas')
            .insert([{
                title: newTitle,
                current_chapter: newChapter || "1",
                slug: slug,
                cover: coverUrl
            }])
            .select();

        if (error) {
            console.error("Erreur d'ajout:", error);
            alert("Erreur lors de l'ajout. Vérifie que tu as bien lancé le SQL dans Supabase !");
        } else if (data) {
            // On ajoute localement pour que l'interface soit rapide
            setMangas([data[0], ...mangas]);
        }

        setNewTitle("");
        setNewChapter("");
        setIsLoading(false);
        setIsModalOpen(false);
    };

    // 3. SUPPRESSION : On supprime du Cloud
    const deleteManga = async (id: string) => {
        // Mise à jour optimiste
        setMangas(mangas.filter(m => m.id !== id));

        const { error } = await supabase.from('mangas').delete().eq('id', id);
        if (error) console.error("Erreur suppression:", error);
    };

    // 4. MISE A JOUR : On modifie le chapitre dans le Cloud
    const updateChapter = async (id: string, delta: number) => {
        const mangaToUpdate = mangas.find(m => m.id === id);
        if (!mangaToUpdate) return;

        const newChapterVal = Math.max(1, parseInt(mangaToUpdate.current_chapter) + delta).toString();

        // Mise à jour écran
        setMangas(mangas.map(m => m.id === id ? { ...m, current_chapter: newChapterVal } : m));

        // Envoi Supabase
        const { error } = await supabase
            .from('mangas')
            .update({ current_chapter: newChapterVal })
            .eq('id', id);

        if (error) console.error("Erreur update:", error);
    };

    const openScan = (manga: Manga) => {
        // Recherche Google intelligente
        const query = `lecture en ligne scan ${manga.title} chapitre ${manga.current_chapter} vf`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-orange-500 tracking-tighter flex items-center gap-3">
                        SCAN TRACKER <Cloud className="text-blue-500 animate-pulse" size={24} />
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {mangas.length} mangas • Synchronisé Cloud
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-500 p-4 rounded-full transition-transform active:scale-90 shadow-xl shadow-orange-900/20"
                >
                    <Plus size={28} />
                </button>
            </header>

            {/* Barre de recherche */}
            <div className="max-w-6xl mx-auto mb-10">
                <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full bg-[#161b2c] border-2 border-gray-800 rounded-2xl py-4 px-6 focus:border-orange-500 outline-none text-xl transition-colors"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grille */}
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {mangas
                    .filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
                    .map(manga => (
                        <div key={manga.id} className="bg-[#161b2c] rounded-3xl overflow-hidden border border-gray-800 group hover:border-orange-500/30 transition-all hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col">

                            <div className="relative aspect-[2/3] cursor-pointer overflow-hidden bg-gray-900" onClick={() => openScan(manga)}>
                                <img
                                    src={manga.cover}
                                    alt={manga.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; e.currentTarget.onerror = null; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent opacity-90" />

                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="font-bold text-lg leading-tight mb-2 text-white drop-shadow-md line-clamp-2">{manga.title}</h3>
                                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                        Chapitre {manga.current_chapter}
                                    </span>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                        <ExternalLink size={24} />
                                    </div>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-[#161b2c] border border-gray-700 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-3xl font-black mb-1 text-white">Ajouter</h2>
                        <form onSubmit={addManga} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Titre</label>
                                <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white transition-all" placeholder="ex: One Piece" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Scan actuel</label>
                                <input type="number" value={newChapter} onChange={e => setNewChapter(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white transition-all" placeholder="ex: 1100" />
                            </div>
                            <button disabled={isLoading} type="submit" className="w-full bg-orange-600 py-4 rounded-xl font-black text-white hover:bg-orange-500 transition-all flex justify-center gap-2">
                                {isLoading ? <RefreshCw className="animate-spin" /> : "SAUVEGARDER DANS LE CLOUD"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}