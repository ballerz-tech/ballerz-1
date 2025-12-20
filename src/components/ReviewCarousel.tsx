"use client";

import { useState } from "react";

const images = [
  "https://jerseywala.in/cdn/shop/files/466063605_1142584110906606_4958682630687692071_n.jpg?v=1733433700&width=400",
  "https://jerseywala.in/cdn/shop/files/467378600_609455338167889_181525910962469965_n.jpg?v=1733433717&width=400",
  "https://jerseywala.in/cdn/shop/files/467412609_8679422135459605_7687179873242300504_n.jpg?v=1733433735&width=400",
  "https://jerseywala.in/cdn/shop/files/467401905_931231362253946_5971249444358728777_n.jpg?v=1733433774&width=400",
  "https://jerseywala.in/cdn/shop/files/467403038_589688816843664_7389677793209991228_n.jpg?v=1733433800&width=400",
  "https://jerseywala.in/cdn/shop/files/467441914_918158240253343_8939258952041094529_n.jpg?v=1733433855&width=400"
];

export default function ReviewCarousel() {
  const visibleCount = 3;
  const panels = Math.ceil(images.length / visibleCount);
  const [panelIndex, setPanelIndex] = useState(0);

  const movePanel = (dir: number) => {
    setPanelIndex((p) => (p + dir + panels) % panels);
  };

  const getVisible = (panel: number) => {
    const start = panel * visibleCount;
    return Array.from({ length: visibleCount }).map((_, i) =>
      images[(start + i) % images.length]
    );
  };

  const visible = getVisible(panelIndex);

  return (
    <section className="py-16">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">Customer Reviews</h2>
      <div className="flex items-center justify-center gap-4">
        <button
          aria-label="Previous"
          onClick={() => movePanel(-1)}
          className="text-3xl px-3 text-white hover:text-gray-300 transition-colors"
        >
          ‹
        </button>

        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-3 gap-6">
            {visible.map((src, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border-4 border-gray-700 bg-gray-900 flex items-center justify-center max-h-[28rem] md:max-h-[36rem]"
              >
                <img src={src} alt={`Customer ${panelIndex * visibleCount + idx + 1}`} className="max-h-full w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>

        <button
          aria-label="Next"
          onClick={() => movePanel(1)}
          className="text-3xl px-3 text-white hover:text-gray-300 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Dots removed per request */}
    </section>
  );
}
