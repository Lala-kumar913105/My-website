"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: number;
  seller_id: number;
  caption?: string | null;
  media_url: string;
  media_type?: string | null;
  hashtags?: string | null;
  like_count: number;
  comment_count: number;
  created_at?: string | null;
}

interface Story {
  id: number;
  seller_id: number;
  media_url: string;
  media_type?: string | null;
  expires_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at?: string | null;
}

export default function SocialFeedPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [feed, setFeed] = useState<Post[]>([]);
  const [recommendedFeed, setRecommendedFeed] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});

  const fetchFeed = async (reset = false) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch(`${API}/api/v1/social/feed?skip=${reset ? 0 : skip}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data: Post[] = await response.json();
      setFeed((prev) => (reset ? data : [...prev, ...data]));
      setSkip((prev) => (reset ? data.length : prev + data.length));
    } catch (error) {
      console.error("Failed to fetch feed", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await fetch(`${API}/api/v1/social/trending`);
      if (!response.ok) return;
      const data: Post[] = await response.json();
      setTrending(data);
    } catch (error) {
      console.error("Failed to load trending", error);
    }
  };

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API}/api/v1/social/stories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data: Story[] = await response.json();
      setStories(data);
    } catch (error) {
      console.error("Failed to load stories", error);
    }
  };

  useEffect(() => {
    fetchFeed(true);
    fetchRecommendedFeed();
    fetchTrending();
    fetchStories();
  }, []);

  const fetchRecommendedFeed = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API}/api/v1/recommendations/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data: Post[] = await response.json();
      setRecommendedFeed(data);
    } catch (error) {
      console.error("Failed to load recommended feed", error);
    }
  };

  const handleLike = async (postId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${API}/api/v1/social/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      fetchFeed(true);
      fetchTrending();
    }
  };

  const loadComments = async (postId: number) => {
    const response = await fetch(`${API}/api/v1/social/posts/${postId}/comments`);
    if (response.ok) {
      const data: Comment[] = await response.json();
      setComments((prev) => ({ ...prev, [postId]: data }));
    }
  };

  const handleComment = async (postId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const content = commentDraft[postId];
    if (!content) return;

    const response = await fetch(`${API}/api/v1/social/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (response.ok) {
      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
      loadComments(postId);
      fetchTrending();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Social Feed</h1>
          <button
            onClick={() => router.push("/chat")}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm text-white"
          >
            Open Chats
          </button>
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-4">
            {stories.map((story) => (
              <div key={story.id} className="min-w-[120px] bg-white rounded-xl shadow p-3">
                <div className="h-20 w-full rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-500">Story {story.seller_id}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Expires {new Date(story.expires_at).toLocaleTimeString()}</p>
              </div>
            ))}
            {stories.length === 0 && (
              <p className="text-sm text-gray-500">No stories yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {recommendedFeed.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="text-lg font-semibold mb-4">Recommended for you</h2>
                <div className="space-y-4">
                  {recommendedFeed.map((post) => (
                    <div key={post.id} className="border rounded-xl p-3">
                      <p className="text-sm font-medium">Seller #{post.seller_id}</p>
                      {post.caption && <p className="text-xs text-gray-500">{post.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loading ? (
              <p className="text-gray-500">Loading feed...</p>
            ) : feed.length === 0 ? (
              <p className="text-gray-500">Follow sellers to see posts.</p>
            ) : (
              feed.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Seller #{post.seller_id}</p>
                      <p className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleString() : ""}</p>
                    </div>
                    <span className="text-xs text-gray-500">{post.media_type}</span>
                  </div>
                  <div className="mt-4 h-64 rounded-xl bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Media Preview</span>
                  </div>
                  {post.caption && <p className="mt-3 text-gray-700">{post.caption}</p>}
                  {post.hashtags && <p className="mt-2 text-xs text-purple-500">{post.hashtags}</p>}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <button onClick={() => handleLike(post.id)} className="text-purple-600">Like ({post.like_count})</button>
                    <button onClick={() => loadComments(post.id)} className="text-gray-600">Comments ({post.comment_count})</button>
                    <button className="text-gray-600">Share</button>
                  </div>
                  <div className="mt-3">
                    {(comments[post.id] || []).map((comment) => (
                      <p key={comment.id} className="text-sm text-gray-600">
                        User {comment.user_id}: {comment.content}
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentDraft[post.id] ?? ""}
                      onChange={(event) =>
                        setCommentDraft((prev) => ({ ...prev, [post.id]: event.target.value }))
                      }
                      className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm"
                      placeholder="Write a comment"
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      className="rounded-full bg-purple-600 px-4 py-2 text-sm text-white"
                    >
                      Post
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => {
                setLoadingMore(true);
                fetchFeed();
              }}
              className="w-full rounded-full border border-gray-200 py-2 text-sm"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-lg font-semibold mb-4">Trending Posts</h2>
              <div className="space-y-3">
                {trending.map((post) => (
                  <div key={post.id} className="text-sm">
                    <p className="font-medium">Post #{post.id}</p>
                    <p className="text-xs text-gray-500">Likes {post.like_count}</p>
                  </div>
                ))}
                {trending.length === 0 && (
                  <p className="text-sm text-gray-500">No trending posts yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
