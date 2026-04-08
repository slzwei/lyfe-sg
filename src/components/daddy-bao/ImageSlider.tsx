"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageSliderProps {
  images: string[];
  interval?: number;
}

export default function ImageSlider({ images, interval = 4000 }: ImageSliderProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  const goTo = useCallback((i: number) => setActive(i), []);

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === active ? 1 : 0,
          }}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-[30px] left-0 right-0 flex justify-center gap-[10px] z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-[10px] h-[10px] rounded-full border border-black bg-[#fde6d4] transition-opacity duration-300 cursor-pointer ${
                i === active ? "opacity-100" : "opacity-50"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
