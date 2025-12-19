"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { generateInvoice } from "@/utils/generateInvoice";

type OrderStatus =
  | "placed"
  | "confirmed"
  | "shipped"
  | "out for delivery"
  | "completed";

type OrderItem = {
  ID: number | string;
  Quantity: number;
  Size?: string;
  product?: {
    Description?: string;
    Product?: string;
    Price?: number;
    ImageUrl1?: string;
  };
};

type Order = {
  id: string;
  createdAt: any;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  // 🔐 Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [user, loading, router]);

  // 🔥 Fetch orders from Firestore
  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, "Orders"),
      where("userEmail", "==", user.email),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows: Order[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setOrders(rows);
      setFetching(false);
    });

    return () => unsub();
  }, [user]);

  // 🛒 BUY AGAIN — Firestore + CartContext
  const handleBuyAgain = async (items: OrderItem[]) => {
    if (!user?.email) return;

    const cartRef = collection(db, "Cart");

    for (const item of items) {
      const q = query(
        cartRef,
        where("UserMail", "==", user.email),
        where("ID", "==", item.ID),
        where("Size", "==", (item.Size || "S"))
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        // Update existing cart item
        const docRef = snap.docs[0].ref;
        const prevQty = snap.docs[0].data().Quantity || 0;

        await updateDoc(docRef, {
          Quantity: prevQty + item.Quantity,
          ["Added On"]: serverTimestamp(),
        });
      } else {
        // Add new cart item
        await addDoc(cartRef, {
          ID: item.ID,
          Quantity: item.Quantity,
          Size: item.Size || "S",
          UserMail: user.email,
          ["Added On"]: serverTimestamp(),
        });
      }

      // Update cart badge UI
      for (let i = 0; i < item.Quantity; i++) {
        addItem(String(item.ID));
      }
    }

    router.push("/cart");
  };

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-12 py-10">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <div className="flex justify-between items-center">
          <span
            onClick={() => router.push("/")}
            className="text-2xl font-bold cursor-pointer"
          >
            Ballerz
          </span>
          <h1 className="text-3xl font-bold">Your Orders</h1>
        </div>
        
        <button
          onClick={() => router.back()}
          className="font-bold hover:underline"
        >
          ← Back
        </button>

      </div>

      {orders.length === 0 ? (
        <p className="text-lg font-medium">You have no orders yet.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-2 rounded-xl p-6 space-y-4"
            >
              {/* Order meta */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">
                    Order ID: <span className="font-mono">{order.id}</span>
                  </p>
                  <p className="text-sm">{formatDate(order.createdAt)}</p>
                </div>

                <span className="px-4 py-1 rounded-full border font-semibold capitalize">
                  {order.status}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm font-medium"
                  >
                    <span>
                      {item.product?.Description ?? "Product"} ×{" "}
                      {item.Quantity}
                    </span>
                    <span>
                      Rs. {(item.product?.Price ?? 0) * item.Quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span>Rs. {order.total}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button className="px-4 py-2 border-2 rounded font-bold">
                  Track Order
                </button>

                <button
                  onClick={() => handleBuyAgain(order.items)}
                  className="px-4 py-2 border-2 rounded font-bold"
                >
                  Buy Again
                </button>

                <button
                  onClick={() => generateInvoice(order)}
                  className="px-4 py-2 border-2 rounded font-bold"
                >
                  Download Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
