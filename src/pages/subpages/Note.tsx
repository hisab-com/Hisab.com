import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { StickyNote, Plus, Trash2, Edit, Loader2, X, CheckCircle2, Search, Calendar, MoreVertical } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, NOTES_COLLECTION, ID, Query } from '../../lib/appwrite';

export default function Note({ onBack, shop }: any) {
    const { t, themeClasses } = useAppConfig();
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [editNoteId, setEditNoteId] = useState('');
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, [shop.$id]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, NOTES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setNotes(res.documents);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteTitle.trim() && !noteContent.trim()) return;
        setIsSaving(true);
        try {
            const noteData = {
                shop_id: shop.$id,
                title: noteTitle,
                content: noteContent,
                date: new Date().toISOString()
            };

            if (editNoteId) {
                await databases.updateDocument(DB_ID, NOTES_COLLECTION, editNoteId, noteData);
            } else {
                await databases.createDocument(DB_ID, NOTES_COLLECTION, ID.unique(), noteData);
            }
            
            await fetchNotes();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Failed to save note.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await databases.deleteDocument(DB_ID, NOTES_COLLECTION, id);
            setNotes(notes.filter(n => n.$id !== id));
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note.');
        }
    };

    const openModal = (type: 'add' | 'edit', note?: any) => {
        if (type === 'add') {
            setEditNoteId('');
            setNoteTitle('');
            setNoteContent('');
        } else if (note) {
            setEditNoteId(note.$id);
            setNoteTitle(note.title || '');
            setNoteContent(note.content || '');
        }
        setShowModal(true);
    };

    const filteredNotes = notes.filter(n => 
        (n.title && n.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader 
                title={t.note || "Notes"} 
                onBack={onBack} 
                rightContent={
                    <button onClick={() => openModal('add')} className={`px-4 py-2 bg-white ${themeClasses.primaryText} font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 flex items-center text-sm`}>
                        <Plus className="h-4 w-4 mr-1" /> {t.add || "Add"}
                    </button>
                }
            />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText.split(' ')[0]} transition-colors`} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchPlaceholder || "Search notes..."} 
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                        <p className="text-slate-500 text-sm font-medium">Loading notes...</p>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                        <div className="h-20 w-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <StickyNote className="h-10 w-10 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No Notes</h3>
                        <p className="text-slate-500 text-sm">Tap the Add button to create your first note.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredNotes.map(n => (
                            <div key={n.$id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800 text-lg truncate pr-8">{n.title || "Untitled Note"}</h3>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openModal('edit', n)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteNote(n.$id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm line-clamp-4 mb-4 whitespace-pre-wrap flex-1">{n.content}</p>
                                <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <Calendar className="h-3 w-3 mr-1" /> {new Date(n.date || n.$createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <StickyNote className={`h-6 w-6 mr-2 ${themeClasses.primaryText}`} /> {editNoteId ? "Edit Note" : "New Note"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveNote} className="p-6 flex flex-col flex-1 overflow-hidden">
                            <div className="space-y-5 flex-1 flex flex-col">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                                    <input 
                                        type="text" 
                                        value={noteTitle} 
                                        onChange={e => setNoteTitle(e.target.value)} 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-bold" 
                                        placeholder="Note title..." 
                                    />
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Content</label>
                                    <textarea 
                                        value={noteContent} 
                                        onChange={e => setNoteContent(e.target.value)} 
                                        className="flex-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium resize-none" 
                                        placeholder="Write your note here..."
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving || (!noteTitle.trim() && !noteContent.trim())} className={`flex-1 py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center`}>
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <><CheckCircle2 className="h-5 w-5 mr-2" /> Save Note</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
