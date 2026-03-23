import { compressImage } from './imageCompression';

// ⚠️ অ্যাপের ডিফল্ট স্টোরেজ (শুধু Cloud Name এবং Unsigned Preset থাকবে)
// এটি লোগো বা প্রোফাইল ছবির জন্য, অথবা যে ইউজারের নিজস্ব স্টোরেজ নেই তার জন্য ব্যবহৃত হবে।
export const DEFAULT_CLOUDINARY = {
    cloudName: 'dpf8idv34', // আপনার ক্লাউড নেম
    uploadPreset: 'stashio_default' // আপনার তৈরি করা ডিফল্ট Unsigned Preset
};

export const uploadToCloudinary = async (
    file: File, 
    userCloudName?: string, 
    userUploadPreset?: string
): Promise<{ url: string, public_id: string }> => {
    try {
        // ১. ছবি কম্প্রেস করা (আগের মতোই)
        const compressedBase64 = await compressImage(file, 50); 
        
        // Base64 থেকে Blob/File এ কনভার্ট করা
        const arr = compressedBase64.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const compressedFile = new File([u8arr], "stashio_image.jpg", { type: mime });

        // ২. চেক করা হচ্ছে ইউজারের নিজস্ব ক্লাউডিনারি ডেটা আছে কি না
        // যদি ইউজারের দেওয়া Cloud Name এবং Preset থাকে, তবে সেটি ব্যবহার হবে। না হলে ডিফল্টটি ব্যবহার হবে।
        const targetCloudName = (userCloudName && userCloudName.trim() !== '') ? userCloudName : DEFAULT_CLOUDINARY.cloudName;
        const targetPreset = (userUploadPreset && userUploadPreset.trim() !== '') ? userUploadPreset : DEFAULT_CLOUDINARY.uploadPreset;

        // ৩. ক্লাউডিনারিতে Unsigned Upload রিকোয়েস্ট পাঠানো
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', targetPreset);

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${targetCloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            throw new Error(`Upload failed: ${errText}`);
        }

        const data = await uploadResponse.json();
        
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
        
    } catch (error: any) {
        console.error('Error processing image:', error);
        if (error.message === 'Failed to fetch') {
            throw new Error('Cloudinary তে কানেক্ট করা যাচ্ছে না। আপনার ইন্টারনেট কানেকশন অথবা Cloud Name চেক করুন।');
        }
        throw new Error(error.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    }
};

// ৪. নিরাপদ ডিলিট ফাংশন (ফ্রন্টএন্ড থেকে সরাসরি ডিলিট বন্ধ করা হলো)
export const deleteFromCloudinary = async (
    publicId: string
): Promise<boolean> => {
    console.warn("Security Alert: ফ্রন্টএন্ড থেকে সরাসরি ছবি ডিলিট করা বন্ধ করা হয়েছে। ডেটাবেস থেকে লিংঙ্ক মুছে ফেলাই যথেষ্ট।");
    return true; 
};
