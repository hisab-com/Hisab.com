import { compressImage } from './imageCompression';

export const DEFAULT_CLOUDINARY = {
    cloudName: 'dpf8idv34',
    apiKey: '729493882159444',
    apiSecret: 'FSx_5DzbXcQKPkb9GnxHPTZZ6es'
};

export const generateCloudinarySignature = async (params: Record<string, string>, apiSecret: string) => {
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + apiSecret;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const uploadToCloudinary = async (
    file: File, 
    cloudName?: string, 
    uploadPresetOrApiKey?: string, 
    apiSecret?: string
): Promise<{ url: string, public_id: string }> => {
    try {
        const compressedBase64 = await compressImage(file, 100);
        
        const arr = compressedBase64.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const compressedFile = new File([blob], "image.jpg", { type: mime });

        const formData = new FormData();
        formData.append('file', compressedFile);

        const finalCloudName = cloudName || DEFAULT_CLOUDINARY.cloudName;

        if (apiSecret) {
            // Signed upload with provided credentials
            const timestamp = Math.round((new Date).getTime() / 1000).toString();
            const paramsToSign = { timestamp };
            const signature = await generateCloudinarySignature(paramsToSign, apiSecret);
            formData.append('api_key', uploadPresetOrApiKey!);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
        } else if (uploadPresetOrApiKey) {
            // Unsigned upload with provided preset
            formData.append('upload_preset', uploadPresetOrApiKey);
        } else {
            // Default signed upload using DEFAULT_CLOUDINARY
            const timestamp = Math.round((new Date).getTime() / 1000).toString();
            const paramsToSign = { timestamp };
            const signature = await generateCloudinarySignature(paramsToSign, DEFAULT_CLOUDINARY.apiSecret);
            formData.append('api_key', DEFAULT_CLOUDINARY.apiKey);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
        }

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${finalCloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (uploadResponse.ok) {
            const data = await uploadResponse.json();
            return { url: data.secure_url, public_id: data.public_id };
        } else {
            const errText = await uploadResponse.text();
            console.error("Cloudinary Upload Error:", errText);
            throw new Error(`Upload failed: ${errText}`);
        }
    } catch (error: any) {
        console.error('Error processing image:', error);
        throw new Error(error.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    }
};

export const deleteFromCloudinary = async (
    publicId: string,
    cloudName: string,
    apiKey: string,
    apiSecret: string
): Promise<boolean> => {
    try {
        const timestamp = Math.round((new Date).getTime() / 1000).toString();
        const paramsToSign = { public_id: publicId, timestamp };
        const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const deleteResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            body: formData
        });

        if (deleteResponse.ok) {
            return true;
        } else {
            const errText = await deleteResponse.text();
            console.error("Cloudinary Delete Error:", errText);
            return false;
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
};
