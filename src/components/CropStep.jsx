import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedDataUrl(imageSrc, pixelCrop) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return canvas.toDataURL('image/jpeg', 0.92);
}

// A manual crop step so the stored/displayed photo is just the card, not
// whatever surface it was photographed on. Card-shaped (5:7) crop area by
// default, with "Use full photo" as an escape hatch for whoever doesn't
// want to bother framing it.
export default function CropStep({ imageSrc, onDone, onSkip }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [working, setWorking] = useState(false);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function confirmCrop() {
    if (!croppedAreaPixels) return;
    setWorking(true);
    try {
      const dataUrl = await getCroppedDataUrl(imageSrc, croppedAreaPixels);
      onDone(dataUrl);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ position: 'relative', width: '100%', height: 360, background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={5 / 7}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-dim)', margin: '8px 0' }}>
        Drag to reposition, pinch or scroll to zoom, then frame just the card.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-brass" onClick={confirmCrop} disabled={working} style={{ flex: 1 }}>
          {working ? 'Cropping…' : 'Use this crop'}
        </button>
        <button className="btn btn-ghost" onClick={onSkip} style={{ flex: 1 }}>
          Use full photo
        </button>
      </div>
    </div>
  );
}
