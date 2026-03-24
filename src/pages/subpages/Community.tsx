import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Share2, Image as ImageIcon, Send, Loader2, User, Trash2, MoreVertical, Globe, Lock } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';
import { databases, DB_ID, POSTS_COLLECTION, Query, ID } from '../../lib/appwrite';
import PageHeader from '../../components/PageHeader';
import { uploadToCloudinary, DEFAULT_CLOUDINARY } from '../../utils/cloudinary';

export default function Community({ onBack, shop }: { onBack: () => void, shop?: any }) {
    const { t, themeClasses } = useAppConfig();
    const { user } = useAuth();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [postImage, setPostImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, POSTS_COLLECTION, [
                Query.orderDesc('created_at'),
                Query.limit(20)
            ]);
            setPosts(res.documents);
        } catch (error: any) {
            console.error('Error fetching posts:', error);
            if (error.message?.includes('Attribute not found')) {
                console.warn('Posts collection missing attributes (created_at).');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPostImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent.trim() && !postImage) return;
        if (!user) return;

        setIsPosting(true);
        try {
            let imageUrl = '';
            if (postImage) {
                // Use user's custom API if configured, otherwise default
                // The user requested: "ইমেজ পোস্ট করলে তাদের api তে যাবে"
                // So we check if shop has custom API or use default
                const customConfig = shop?.uploadme_api_key ? JSON.parse(shop.uploadme_api_key) : null;
                const uploadRes = await uploadToCloudinary(postImage, customConfig || DEFAULT_CLOUDINARY);
                imageUrl = uploadRes.url;
            }

            const postData = {
                author_id: user.$id,
                author_name: user.name,
                author_avatar: user.prefs?.avatar_url || '',
                content: postContent,
                image_url: imageUrl,
                created_at: new Date().toISOString(),
                shop_id: shop?.$id || ''
            };

            await databases.createDocument(DB_ID, POSTS_COLLECTION, ID.unique(), postData);
            setPostContent('');
            setPostImage(null);
            setImagePreview(null);
            fetchPosts();
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await databases.deleteDocument(DB_ID, POSTS_COLLECTION, postId);
            setPosts(posts.filter(p => p.$id !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <PageHeader 
                title={t.community || "Community"} 
                onBack={onBack} 
                icon={Globe}
            />

            <div className="max-w-md mx-auto sm:max-w-3xl p-4 space-y-6">
                {/* Create Post */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
                    <form onSubmit={handleCreatePost} className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                {user?.prefs?.avatar_url ? (
                                    <img src={user.prefs.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder="What's on your mind about your business?"
                                className="flex-1 bg-slate-50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-opacity-50 outline-none resize-none min-h-[100px]"
                            />
                        </div>

                        {imagePreview && (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-100">
                                <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-[300px] object-cover" />
                                <button 
                                    type="button"
                                    onClick={() => { setPostImage(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <label className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors p-2 rounded-xl hover:bg-slate-50">
                                <ImageIcon className="h-5 w-5" />
                                <span className="text-xs font-bold">Photo</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>

                            <button
                                type="submit"
                                disabled={isPosting || (!postContent.trim() && !postImage)}
                                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold transition-all active:scale-95 disabled:opacity-70`}
                            >
                                {isPosting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span>Post</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Feed */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText}`} />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-3xl border border-slate-100">
                        <MessageSquare className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                        <p className="font-medium">No posts yet. Be the first to share!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {posts.map(post => (
                            <div key={post.$id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden">
                                            {post.author_avatar ? (
                                                <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-slate-400">
                                                    <User className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{post.author_name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(post.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {user?.$id === post.author_id && (
                                        <button onClick={() => handleDeletePost(post.$id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="px-4 pb-4">
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                </div>

                                {post.image_url && (
                                    <div className="border-y border-slate-50">
                                        <img src={post.image_url} alt="Post" className="w-full h-auto max-h-[500px] object-cover" />
                                    </div>
                                )}

                                <div className="p-3 flex items-center space-x-4 border-t border-slate-50">
                                    <button className="flex items-center space-x-1.5 text-slate-500 hover:text-rose-500 transition-colors p-2 rounded-xl hover:bg-slate-50">
                                        <Heart className="h-5 w-5" />
                                        <span className="text-xs font-bold">Like</span>
                                    </button>
                                    <button className="flex items-center space-x-1.5 text-slate-500 hover:text-blue-500 transition-colors p-2 rounded-xl hover:bg-slate-50">
                                        <MessageSquare className="h-5 w-5" />
                                        <span className="text-xs font-bold">Comment</span>
                                    </button>
                                    <button className="flex items-center space-x-1.5 text-slate-500 hover:text-emerald-500 transition-colors p-2 rounded-xl hover:bg-slate-50">
                                        <Share2 className="h-5 w-5" />
                                        <span className="text-xs font-bold">Share</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
