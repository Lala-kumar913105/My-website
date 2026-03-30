"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CoinBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  streak_count: number;
  badge_label?: string | null;
}

interface CoinTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  reason: string;
  created_at?: string | null;
}

export default function RewardsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [wallet, setWallet] = useState<CoinBalance | null>(null);
  const [history, setHistory] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const [balanceRes, historyRes] = await Promise.all([
          fetch(`${API}/api/v1/coins/balance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/coins/history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setWallet(data);
        }

        if (historyRes.ok) {
          const data = await historyRes.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to load rewards", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [API, router]);

  const claimDailyBonus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/api/v1/coins/daily-login-bonus`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setMessage("Unable to claim daily reward");
        return;
      }
      const data = await response.json();
      setMessage(data.message);
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              balance: data.coins_balance,
              streak_count: data.streak_count,
              badge_label: data.badge_label,
            }
          : prev
      );
    } catch (error) {
      setMessage("Unable to claim daily reward");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-xl">
          <h1 className="text-2xl font-semibold">Rewards Center</h1>
          <p className="text-sm text-purple-100">Keep your streak alive and redeem coins.</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase">Balance</p>
              <p className="text-lg font-semibold">{wallet?.balance ?? 0} coins</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase">Streak</p>
              <p className="text-lg font-semibold">{wallet?.streak_count ?? 0} days</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase">Badge</p>
              <p className="text-lg font-semibold">{wallet?.badge_label ?? "Bronze"}</p>
            </div>
          </div>
          <button
            onClick={claimDailyBonus}
            className="mt-4 rounded-full bg-white px-6 py-2 text-sm font-semibold text-purple-700"
          >
            Claim Daily Bonus
          </button>
          {message && <p className="mt-2 text-xs text-white/80">{message}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Total earned</p>
            <p className="text-2xl font-semibold">{wallet?.total_earned ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Total spent</p>
            <p className="text-2xl font-semibold">{wallet?.total_spent ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Next badge</p>
            <p className="text-2xl font-semibold">Shop more to level up</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Coin History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium capitalize">{entry.reason.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${entry.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}