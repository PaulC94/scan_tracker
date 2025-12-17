"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, Trash2, ChevronUp, ChevronDown, X, RefreshCw } from 'lucide-react';

interface Manga {
    id: string;
    title: string;
    currentChapter: string;
    slug: string;
    cover: string;
}

export default function MangaTracker() {
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Pour montrer qu'on cherche l'image

    // Formulaire
    const [newTitle, setNewTitle] = useState("");
    const [newChapter, setNewChapter] = useState("");

    // Image de secours (au cas où tout plante)
    const FALLBACK_IMAGE = "https://placehold.co/400x600/1e293b/orange?text=No+Cover&font=montserrat";

    useEffect(() => {
        const saved = localStorage.getItem('my-mangas-v3');
        if (saved) setMangas(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('my-mangas-v3', JSON.stringify(mangas));
    }, [mangas]);

    const addManga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        setIsLoading(true);
        const slug = newTitle.toLowerCase().trim().replace(/\s+/g, '-');
        let coverUrl = FALLBACK_IMAGE;

        try {
            // 1. On interroge l'API Jikan (la référence manga)
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(newTitle)}&limit=1`);
            const data = await response.json();

            // 2. On vérifie si on a bien reçu une image
            if (data.data && data.data.length > 0) {
                coverUrl = data.data[0].images.jpg.large_image_url;
            }
        } catch (error) {
            console.error("Erreur de récupération d'image", error);
            // Pas grave, on gardera l'image de fallback définie plus haut
        }

        const newEntry: Manga = {
            id: Date.now().toString(),
            title: newTitle,
            currentChapter: newChapter || "1",
            slug: slug,
            cover: coverUrl
        };

        setMangas([...mangas, newEntry]);
        setNewTitle("");
        setNewChapter("");
        setIsLoading(false);
        setIsModalOpen(false);
    };

    const deleteManga = (id: string) => {
        setMangas(mangas.filter(m => m.id !== id));
    };

    const updateChapter = (id: string, delta: number) => {
        setMangas(mangas.map(m => {
            if (m.id === id) {
                const val = Math.max(1, parseInt(m.currentChapter) + delta);
                return { ...m, currentChapter: val.toString() };
            }
            return m;
        }));
    };

    const openScan = (manga: Manga) => {
        const url = `https://www.scan-manga.com/lecture-en-ligne/${manga.slug}-chapitre-${manga.currentChapter}.html`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-orange-500 tracking-tighter">SCAN TRACKER</h1>
                    <p className="text-gray-400 text-sm">{mangas.length} mangas en cours</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-500 p-4 rounded-full transition-transform active:scale-90 shadow-xl shadow-orange-900/20"
                >
                    <Plus size={28} />
                </button>
            </header>

            <div className="max-w-6xl mx-auto mb-10">
                <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full bg-[#161b2c] border-2 border-gray-800 rounded-2xl py-4 px-6 focus:border-orange-500 outline-none text-xl transition-colors"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {mangas
                    .filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
                    .map(manga => (
                        <div key={manga.id} className="bg-[#161b2c] rounded-3xl overflow-hidden border border-gray-800 group hover:border-orange-500/30 transition-all hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col">

                            {/* Zone Image Clickable */}
                            <div className="relative aspect-[2/3] cursor-pointer overflow-hidden bg-gray-900" onClick={() => openScan(manga)}>
                                <img
                                    src={manga.cover}
                                    alt={manga.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        // C'EST ICI QUE LA MAGIE OPÈRE : Si l'image plante, on met le fallback
                                        e.currentTarget.src = FALLBACK_IMAGE;
                                        e.currentTarget.onerror = null; // Empêche une boucle infinie
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent opacity-90" />

                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="font-bold text-lg leading-tight mb-2 text-white drop-shadow-md line-clamp-2">{manga.title}</h3>
                                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                        Chapitre {manga.currentChapter}
                                    </span>
                                </div>

                                {/* Overlay au survol */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                        <ExternalLink size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Contrôles */}
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
                        <p className="text-gray-400 text-sm mb-8">Quelle série lisez-vous ?</p>

                        <form onSubmit={addManga} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Titre du Manga / Webtoon</label>
                                <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white placeholder-gray-600 transition-all" placeholder="ex: Solo Leveling" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Numéro du scan</label>
                                <input type="number" value={newChapter} onChange={e => setNewChapter(e.target.value)} className="w-full bg-[#0b0f1a] border border-gray-700 p-4 rounded-xl outline-none focus:border-orange-500 text-white placeholder-gray-600 transition-all" placeholder="ex: 120" />
                            </div>

                            <button disabled={isLoading} type="submit" className="w-full bg-orange-600 py-4 rounded-xl font-black text-white hover:bg-orange-500 transition-all shadow-lg shadow-orange-900/20 active:scale-95 flex justify-center items-center gap-2">
                                {isLoading ? <RefreshCw className="animate-spin" /> : "VALIDER"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}