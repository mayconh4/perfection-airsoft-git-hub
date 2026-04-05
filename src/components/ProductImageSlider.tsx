import React, { useState, useEffect, useMemo } from 'react';

interface ProductImageSliderProps {
  mainImage: string | null;
  images?: string[] | null;
  alt: string;
  wrapperClassName?: string;
  imgClassName?: string;
  autoplayInterval?: number; // Optional prop to override default
  enableAutoplay?: boolean; // New prop to toggle autoplay
  children?: React.ReactNode;
}

export function ProductImageSlider({ 
  mainImage, 
  images, 
  alt, 
  wrapperClassName = '', 
  imgClassName = '',
  autoplayInterval,
  enableAutoplay = false,
  children
}: ProductImageSliderProps) {
  const [hoverIndex, setHoverIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Define todas as imagens a serem exibidas no slider
  const allImages = useMemo(() => {
    const imgs = mainImage ? [mainImage] : [];
    if (images && images.length > 0) {
      images.forEach(img => {
        if (img && img !== mainImage) imgs.push(img);
      });
    }
    return imgs;
  }, [mainImage, images]);

  // Generate a random-ish interval for organic feel (between 2500ms and 4500ms)
  const dynamicInterval = useMemo(() => {
    if (autoplayInterval) return autoplayInterval;
    return 2500 + Math.random() * 2000;
  }, [autoplayInterval]);

  // Autoplay Effect - Only if enableAutoplay is true
  useEffect(() => {
    if (!enableAutoplay || allImages.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      setHoverIndex((prev) => (prev + 1) % allImages.length);
    }, dynamicInterval);

    return () => clearInterval(interval);
  }, [allImages.length, isHovered, dynamicInterval, enableAutoplay]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (allImages.length <= 1) return;
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const segmentWidth = rect.width / allImages.length;
    let index = Math.floor(x / segmentWidth);
    
    // Evitar que o index ultrapasse o limite caso o mouse passe do border direito
    index = Math.min(Math.max(0, index), allImages.length - 1);
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverIndex(0);
  };

  const currentImage = allImages.length > 1 ? allImages[hoverIndex] : (mainImage || '');

  return (
    <div 
      className={`relative ${wrapperClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Imagem principal */}
      <img 
        key={currentImage} // Key for smooth CSS transitions or re-rendering
        className={`${imgClassName} transition-all duration-1000 ease-in-out`} 
        src={currentImage} 
        alt={alt}
      />
      
      {/* Barrinhas indicadoras na parte inferior (se houver mais de 1 imagem) */}
      {allImages.length > 1 && (
        <div className={`absolute bottom-2 left-0 w-full flex justify-center gap-1 lg:gap-1.5 z-30 px-3 lg:px-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
          {allImages.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-[1px] lg:h-1 flex-1 max-w-[20px] lg:max-w-[24px] rounded-full transition-all duration-700 ${
                idx === hoverIndex ? 'bg-primary shadow-[0_0_8px_rgba(255,193,7,0.6)]' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Renders children (como badges) */}
      {children}
    </div>
  );
}
