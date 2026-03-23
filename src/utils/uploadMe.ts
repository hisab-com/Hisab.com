import { compressImage } from './imageCompression';

export const uploadToUploadMe = async (file: File, apiKey: string): Promise<string> => {
    try {
        // Compress the image to 0-20KB
        const compressedBase64 = await compressImage(file, 20);
        
        // Convert base64 back to blob for upload
        const res = await fetch(compressedBase64);
        const blob = await res.blob();
        
        const formData = new FormData();
        formData.append('image', blob, file.name);
        
        // Attempt to upload to a generic image hosting API (like ImgBB as a fallback/example if upload.me isn't standard)
        try {
            const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            if (uploadResponse.ok) {
                const data = await uploadResponse.json();
                return data.data.url;
            } else {
                throw new Error('Upload failed');
            }
        } catch (e) {
            console.error('Failed to upload to external API', e);
            throw new Error('ছবি আপলোড করতে সমস্যা হয়েছে। দয়া করে সঠিক API Key দিন।');
        }
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
};
