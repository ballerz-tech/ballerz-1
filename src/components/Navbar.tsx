"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useAdmin } from "@/hooks/useAdmin";

export default function Navbar({
  onCategoryClick,
}: {
  onCategoryClick: (cat: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAccountMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      {/* Top Row */}
      <div className="flex items-center justify-between px-10 py-4 font-bold">
        <span
          onClick={() => window.location.reload()}
          className="text-2xl cursor-pointer"
        >
          Ballerz
        </span>

        <div className="relative w-1/3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products"
            className="w-full px-4 py-2 border-2 rounded-full font-semibold"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-4 items-center">
          {!loading && !adminLoading && isAdmin && (
            <Link href="/inventory" className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700">Inventory</Link>
          )}
          
          {!loading && (
            <>
              {user ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setAccountMenuOpen(true)}
                  onMouseLeave={() => setAccountMenuOpen(false)}
                >
                  <button className="font-bold">Account</button>
                  {accountMenuOpen && (
                    <div className="absolute top-8 right-0 bg-white border-2 rounded-xl shadow-lg w-52">
                      <div className="px-4 py-3 border-b">
                        <p className="font-semibold truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 font-semibold text-red-600"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/sign-in" className="font-bold hover:text-indigo-600">
                    Sign In
                  </Link>
                  <Link href="/sign-up" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    Sign Up
                  </Link>
                </>
              )}
            </>
          )}
          
          <span className="relative">
            Cart
            {totalItems > 0 && (
              <sup className="ml-1 text-xs font-bold">{totalItems}</sup>
            )}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex gap-10 px-10 pb-3 font-bold">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Home
        </button>

        <Link href="/shop">
          <button className="hover:underline hover:decoration-2 hover:underline-offset-4 transition-all">Shop</button>
        </Link>

        <button>FAQ</button>
      </nav>
    </header>
  );
}
