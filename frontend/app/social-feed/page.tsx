"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../lib/auth";

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

type FeedTab = "for_you" | "following" | "products" | "services";

export default function SocialFeedPage() {
  const router = useRouter();
  const API = API_BASE_URL;

  const [feed, setFeed] = useState<Post[]>([]);
  const [recommendedFeed, setRecommendedFeed] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");

  const fetchFeed = async (reset = false) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const nextSkip = reset ? 0 : skip;
      const response = await fetch(`${API}/api/v1/social/feed?skip=${nextSkip}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (!response.ok) return;

      const followedData: Post[] = await response.json();

      if (followedData.length > 0) {
        setFeedMessage(null);
        setFeed((prev) => (reset ? followedData : [...prev, ...followedData]));
        setSkip((prev) => (reset ? followedData.length : prev + followedData.length));
        return;
      }

      if (!reset) return;

      const publicResponse = await fetch(`${API}/api/v1/social/posts?skip=0&limit=20`);
      if (!publicResponse.ok) {
        setFeedMessage("No feed posts available yet.");
        setFeed([]);
        return;
      }

      const publicData: Post[] = await publicResponse.json();
      setFeed(publicData);
      setSkip(publicData.length);
      setFeedMessage(
        publicData.length
          ? "Showing public posts because your followed feed is empty."
          : "No feed posts available yet."
      );
    } catch (error) {
      console.error("Failed to fetch feed", error);
      setFeedMessage("Failed to load feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchRecommendedFeed = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API}/api/v1/recommendations/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || !response.ok) return;

      const data: Post[] = await response.json();
      setRecommendedFeed(data);
    } catch (error) {
      console.error("Failed to load recommended feed", error);
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
    if (!response.ok) return;
    const data: Comment[] = await response.json();
    setComments((prev) => ({ ...prev, [postId]: data }));
  };

  const handleComment = async (postId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const content = commentDraft[postId];
    if (!content?.trim()) return;

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

  const tabItems: Array<{ key: FeedTab; label: string }> = [
    { key: "for_you", label: "For You" },
    { key: "following", label: "Following" },
    { key: "products", label: "Products" },
    { key: "services", label: "Services" },
  ];

  const allForYouPosts = useMemo(
    () =>
      [...recommendedFeed, ...feed].reduce<Post[]>((acc, post) => {
        if (!acc.some((existing) => existing.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, []),
    [recommendedFeed, feed]
  );

  const detectPostType = (post: Post): "product" | "service" | "general" => {
    const text = `${post.caption ?? ""} ${post.hashtags ?? ""}`.toLowerCase();
    if (text.includes("#service") || text.includes(" service") || text.includes("booking")) return "service";
    if (text.includes("#product") || text.includes(" product") || text.includes("buy") || text.includes("shop")) return "product";
    return "general";
  };

  const displayedPosts =
    activeTab === "following"
      ? feed
      : activeTab === "products"
        ? allForYouPosts.filter((post) => detectPostType(post) === "product")
        : activeTab === "services"
          ? allForYouPosts.filter((post) => detectPostType(post) === "service")
          : allForYouPosts;

  return (
    <div className="app-shell">
      <div className="app-container space-y-4">
        <section className="ds-hero-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Social Commerce</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Social Feed</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Discover trending products and services from trusted stores.
              </p>
            </div>
            <button onClick={() => router.push("/assistant")} className="ds-btn-primary" type="button">
              Ask AI Assistant
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`ds-chip ${activeTab === tab.key ? "ds-chip-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ds-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="ds-title">Stories</h2>
            <p className="text-xs text-slate-500">Quick seller updates</p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stories.map((story) => (
              <div key={story.id} className="min-w-32 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="h-20 w-full overflow-hidden rounded-xl bg-slate-100">
                  {story.media_type === "video" ? (
                    <video src={story.media_url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={story.media_url} alt="Story" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">Seller #{story.seller_id}</p>
                <p className="text-[11px] text-slate-500">Expires {new Date(story.expires_at).toLocaleTimeString()}</p>
              </div>
            ))}
            {stories.length === 0 && (
              <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No stories yet. New seller updates will appear here.
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <section className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`feed-skeleton-${index}`} className="ds-card h-72 animate-pulse bg-slate-100" />
                ))}
              </div>
            ) : displayedPosts.length === 0 ? (
              <div className="ds-card border-dashed text-center">
                <p className="text-xl font-semibold text-slate-900">Your feed is waiting for you</p>
                <p className="mt-2 text-sm text-slate-600">
                  Follow sellers, explore products, and engage with new posts to personalize this space.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button onClick={() => router.push("/search")} className="ds-btn-primary" type="button">
                    Explore Marketplace
                  </button>
                  <button onClick={() => setActiveTab("following")} className="ds-btn-secondary" type="button">
                    View Following Feed
                  </button>
                </div>
              </div>
            ) : (
              displayedPosts.map((post) => {
                const postType = detectPostType(post);
                const tagItems = (post.hashtags || "").split(" ").map((tag) => tag.trim()).filter(Boolean);

                return (
                  <article key={post.id} className="ds-card overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => router.push(`/store/${post.seller_id}`)}
                          className="text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700"
                        >
                          Seller #{post.seller_id}
                        </button>
                        <p className="text-xs text-slate-500">
                          {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently posted"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {postType !== "general" && (
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {postType}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {post.media_type || "media"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {post.media_type === "video" ? (
                        <video src={post.media_url} controls className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <img
                          src={post.media_url}
                          alt={post.caption || `Post ${post.id}`}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      )}
                    </div>

                    {post.caption && <p className="mt-4 text-sm leading-6 text-slate-700">{post.caption}</p>}

                    {tagItems.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tagItems.slice(0, 6).map((tag) => (
                          <span key={`${post.id}-${tag}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button onClick={() => handleLike(post.id)} className="ds-btn-secondary !rounded-xl !px-3 !py-2 !text-xs" type="button">
                        Like ({post.like_count})
                      </button>
                      <button onClick={() => loadComments(post.id)} className="ds-btn-secondary !rounded-xl !px-3 !py-2 !text-xs" type="button">
                        Comments ({post.comment_count})
                      </button>
                      <button onClick={() => router.push(`/store/${post.seller_id}`)} className="ds-btn-secondary !rounded-xl !px-3 !py-2 !text-xs" type="button">
                        Visit Store
                      </button>
                      <button onClick={() => router.push("/search")} className="ds-btn-primary !rounded-xl !px-3 !py-2 !text-xs" type="button">
                        Shop Now
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {(comments[post.id] || []).map((comment) => (
                        <p key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium text-slate-900">User {comment.user_id}:</span> {comment.content}
                        </p>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        value={commentDraft[post.id] ?? ""}
                        onChange={(event) => setCommentDraft((prev) => ({ ...prev, [post.id]: event.target.value }))}
                        className="ds-input"
                        placeholder="Write a comment"
                      />
                      <button onClick={() => handleComment(post.id)} className="ds-btn-primary !px-4" type="button">
                        Post
                      </button>
                    </div>
                  </article>
                );
              })
            )}

            {feedMessage && (
              <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">{feedMessage}</p>
            )}

            <button
              onClick={() => {
                setLoadingMore(true);
                fetchFeed();
              }}
              className="ds-btn-secondary w-full"
              type="button"
            >
              {loadingMore ? "Loading..." : "Load More Posts"}
            </button>
          </section>

          <aside className="space-y-4">
            <section className="ds-card">
              <h2 className="ds-title">Trending Posts</h2>
              <div className="mt-3 space-y-2">
                {trending.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/store/${post.seller_id}`)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-white"
                    type="button"
                  >
                    <p className="text-sm font-semibold text-slate-900">Post #{post.id}</p>
                    <p className="text-xs text-slate-600">Seller #{post.seller_id}</p>
                    <p className="mt-1 text-xs text-slate-500">{post.like_count} likes • {post.comment_count} comments</p>
                  </button>
                ))}
                {trending.length === 0 && <p className="text-sm text-slate-500">No trending posts yet.</p>}
              </div>
            </section>

            {recommendedFeed.length > 0 && (
              <section className="ds-card">
                <h2 className="ds-title">Recommended for you</h2>
                <div className="mt-3 space-y-2">
                  {recommendedFeed.slice(0, 5).map((post) => (
                    <button
                      key={post.id}
                      onClick={() => router.push(`/store/${post.seller_id}`)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
                      type="button"
                    >
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">Seller #{post.seller_id}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                        {post.caption || "Fresh update from this seller."}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="ds-card">
              <h2 className="ds-title">Quick Actions</h2>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button onClick={() => router.push("/search?type=product")} className="ds-btn-secondary w-full" type="button">
                  Explore Products
                </button>
                <button onClick={() => router.push("/search?type=service")} className="ds-btn-secondary w-full" type="button">
                  Explore Services
                </button>
                <button onClick={() => router.push("/assistant")} className="ds-btn-primary w-full" type="button">
                  Get Buying Help
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
