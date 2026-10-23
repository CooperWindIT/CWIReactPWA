// Image support for the flowchart canvas — shared by all three ways an image
// can get in: pasting from the clipboard, dropping a file onto the canvas, and
// picking one from the toolbar.
//
// Images are stored inline as data URLs on the node (node.src), which means
// they travel with the diagram JSON and the localStorage draft. That keeps
// everything self-contained with no upload step, but it also means a handful
// of full-resolution screenshots could blow past localStorage's ~5MB quota, so
// anything oversized is scaled down before being kept.

// Largest pixel dimension actually stored in the diagram.
const MAX_IMAGE_DIM = 1200;
// Largest dimension an image gets when first placed on the canvas.
const MAX_IMAGE_PLACED = 420;
// Past this, re-encode rather than keep the original bytes.
const SIZE_LIMIT = 600 * 1024;

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Decodes the image, scales it down when oversized, and reports the size it
// should be placed at. Resolves null if the data isn't a usable image.
export function prepareImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const naturalW = img.naturalWidth || 1;
      const naturalH = img.naturalHeight || 1;
      const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(naturalW, naturalH));

      let src = dataUrl;
      let storedW = naturalW;
      let storedH = naturalH;

      if (scale < 1 || dataUrl.length > SIZE_LIMIT) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(naturalW * scale));
          canvas.height = Math.max(1, Math.round(naturalH * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

          // PNG preserves transparency but balloons on photos — fall back to
          // JPEG only when PNG stays oversized.
          let encoded = canvas.toDataURL('image/png');
          if (encoded.length > SIZE_LIMIT) encoded = canvas.toDataURL('image/jpeg', 0.85);

          src = encoded;
          storedW = canvas.width;
          storedH = canvas.height;
        } catch (e) {
          // Unsupported source — keep the original bytes rather than failing.
        }
      }

      const placeScale = Math.min(1, MAX_IMAGE_PLACED / Math.max(storedW, storedH));

      resolve({
        src,
        w: Math.max(20, Math.round(storedW * placeScale)),
        h: Math.max(20, Math.round(storedH * placeScale)),
      });
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Pulls image files out of a clipboard payload or a drag payload. Clipboard
// images arrive as `items` rather than `files`, so both are checked.
export function getImageFiles(dataTransfer) {
  if (!dataTransfer) return [];

  const fromFiles = Array.from(dataTransfer.files || [])
    .filter((file) => file.type && file.type.startsWith('image/'));
  if (fromFiles.length) return fromFiles;

  return Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === 'file' && item.type && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

// Opens the OS file picker and resolves with whatever images were chosen (an
// empty array if cancelled). Built on a throwaway input element so no hidden
// <input> has to live in the component tree.
export function pickImageFiles() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    let settled = false;
    const finish = (files) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
      resolve(files);
    };

    // Cancelling the dialog fires no change event in some browsers, so the
    // window regaining focus is used as the fallback to clean up.
    const onWindowFocus = () => setTimeout(() => finish([]), 300);

    input.onchange = () => finish(Array.from(input.files || []));
    input.oncancel = () => finish([]);

    document.body.appendChild(input);
    window.addEventListener('focus', onWindowFocus);
    input.click();
  });
}

// Turns image files into image nodes via the supplied creator. Multiple images
// are offset slightly so a multi-file paste/drop doesn't stack them exactly on
// top of each other.
export async function placeImageFiles(files, point, onCreateImage) {
  if (!files || !files.length || typeof onCreateImage !== 'function') return;

  for (let index = 0; index < files.length; index += 1) {
    try {
      const dataUrl = await readFileAsDataUrl(files[index]);
      const prepared = await prepareImage(dataUrl);
      if (!prepared) continue;

      onCreateImage({
        src: prepared.src,
        w: prepared.w,
        h: prepared.h,
        x: Math.max(0, Math.round(point.x - prepared.w / 2 + index * 24)),
        y: Math.max(0, Math.round(point.y - prepared.h / 2 + index * 24)),
      });
    } catch (e) {
      // One unreadable file shouldn't stop the rest of the batch.
    }
  }
}