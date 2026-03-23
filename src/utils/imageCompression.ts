export const compressImage = (file: File, maxSizeKB: number = 20): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (max 800px width/height for reasonable quality)
                const maxDim = 800;
                if (width > height) {
                    if (width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Binary search for the right quality to hit the target size
                let minQ = 0.1;
                let maxQ = 0.9;
                let quality = 0.7;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                let sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);

                let attempts = 0;
                while (attempts < 5) {
                    if (sizeKB <= maxSizeKB) {
                        break;
                    }
                    maxQ = quality;
                    quality = (minQ + maxQ) / 2;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
                    attempts++;
                }

                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
