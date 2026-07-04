export const SPORTS = ['Baseball', 'Football', 'Basketball', 'Hockey', 'Soccer', 'Other'];

export function stripeVar(sport) {
  const map = {
    Baseball: 'var(--stripe-baseball)',
    Football: 'var(--stripe-football)',
    Basketball: 'var(--stripe-basketball)',
    Hockey: 'var(--stripe-hockey)',
    Soccer: 'var(--stripe-soccer)',
    Other: 'var(--stripe-other)'
  };
  return map[sport] || map.Other;
}

export function money(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function dateStr(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data:image/...;base64,XXXX
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale a captured photo before storing it, so the app stays fast and
// IndexedDB storage stays small. A separate, higher-res pass (see below) is
// used just for the identify API call, since fine print (card numbers,
// serials, foil parallels) needs more detail than the stored thumbnail.
export function resizeImage(dataUrl, maxDim = 900, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
