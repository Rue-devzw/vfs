import { useEffect, useMemo, useState } from "react";

export type UseImageSlideshowOptions = {
  maxImages?: number;
  intervalMs?: number;
};

export function useImageSlideshow<T>(
  pool: T[],
  { maxImages = 8, intervalMs = 7000 }: UseImageSlideshowOptions = {},
) {
  const filteredPool = useMemo(() => {
    return pool.filter((item): item is T => Boolean(item));
  }, [pool]);

  const initialImages = useMemo(() => {
    if (filteredPool.length === 0) {
      return [] as T[];
    }

    const limit = Math.min(maxImages, filteredPool.length);
    return filteredPool.slice(0, limit);
  }, [filteredPool, maxImages]);

  const [images, setImages] = useState<T[]>(initialImages);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (filteredPool.length === 0) {
      setImages([]);
      setCurrentIndex(0);
      return;
    }

    const limit = Math.min(maxImages, filteredPool.length);
    const shuffled = shuffleArray(filteredPool);
    const selection = shuffled.slice(0, limit);

    setImages(selection);
    setCurrentIndex(selection.length > 0 ? Math.floor(Math.random() * selection.length) : 0);
  }, [filteredPool, maxImages]);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex(previous => (previous + 1) % images.length);
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [images, intervalMs]);

  return { images, currentIndex };
}

function shuffleArray<T>(source: T[]) {
  const array = [...source];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
