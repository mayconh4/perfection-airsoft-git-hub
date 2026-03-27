import { useEffect, useRef } from 'react';

export function MapBackgroundSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Lista com o nome dos seus arquivos: ezgif-frame-001.jpg -> 040.jpg
    const frameCount = 40; 
    const images: HTMLImageElement[] = [];
    let imagesLoaded = 0;

    // Pré-carrega todas as imagens para n\u00e3o piscar a tela
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      // Formata o n\u00famero (ex: 001, 002... 040)
      const frameNum = i.toString().padStart(3, '0');
      img.src = `/maps-sequence/ezgif-frame-${frameNum}.jpg`;
      img.onload = () => { imagesLoaded++; };
      images.push(img);
    }

    let frame = 0;
    let animationId: number;

    const render = () => {
      // S\u00f3 come\u00e7a a tocar quando todas carregarem
      if (imagesLoaded === frameCount) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Cobertura do canvas (object-fit: cover via drawImage math)
        const img = images[frame];
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio  = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;  
        
        ctx.drawImage(img, 0, 0, img.width, img.height,
                      centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
        
        frame = (frame + 1) % frameCount;
      }
      
      // Controla a velocidade (RequestAnimationFrame roda a ~60fps nativamente)
      // Ajuste para tocar nos ~20-24 frames por segundo do gif original
      setTimeout(() => {
        animationId = requestAnimationFrame(render);
      }, 1000 / 20); 
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="fixed inset-0 w-[100vw] h-[100vh] z-0 overflow-hidden pointer-events-none">
       <canvas 
         ref={canvasRef} 
         className="w-full h-full object-cover opacity-100 mix-blend-screen scale-110 brightness-125 contrast-125 saturate-200"
         width={1920} 
         height={1080}
       />
       {/* Overlay Escurecedor mais sutil + Tint verde hacker/radar */}
       <div className="absolute inset-0 bg-[#00ff00]/5 mix-blend-overlay"></div>
       <div className="absolute inset-0 bg-background-dark/60 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>
    </div>
  );
}
