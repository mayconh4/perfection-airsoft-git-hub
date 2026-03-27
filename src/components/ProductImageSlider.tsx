import React, { useState } from 'react';

interface ProductImageSliderProps {
  mainImage: string | null;
  images?: string[] | null;
  alt: string;
  wrapperClassName?: string;
  imgClassName?: string;
  children?: React.ReactNode;
}

export function ProductImageSlider({ 
  mainImage, 
  images, 
  alt, 
  wrapperClassName = '', 
  imgClassName = '',
  children
}: ProductImageSliderProps) {
  const [hoverIndex, setHoverIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Define todas as imagens a serem exibidas no slider
  const allImages = mainImage ? [mainImage] : [];
  if (images && images.length > 0) {
    images.forEach(img => {
      if (img && img !== mainImage) allImages.push(img);
    });
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (allImages.length <= 1) return;
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

  const currentImage = isHovered && allImages.length > 1 ? allImages[hoverIndex] : (mainImage || '');

  return (
    <div 
      className={`relative ${wrapperClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Imagem principal */}
      <img 
        className={`${imgClassName} transition-all duration-300`} 
        src={currentImage} 
        alt={alt}
      />
      
      {/* Barrinhas indicadoras na parte inferior (se houver mais de 1 imagem) */}
      {allImages.length > 1 && isHovered && (
        <div className="absolute bottom-2 left-0 w-full flex justify-center gap-1.5 z-30 px-4">
          {allImages.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 flex-1 max-w-[24px] rounded-full transition-all duration-300 ${
                idx === hoverIndex ? 'bg-primary shadow-[0_0_8px_rgba(255,193,7,0.8)]' : 'bg-white/40'
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
