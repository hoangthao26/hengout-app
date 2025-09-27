// Cloudinary upload service using direct API
// Configure your Cloudinary credentials in environment variables

export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export class CloudinaryService {
    // Cloudinary configuration - replace with your actual values
    private static readonly CLOUD_NAME = 'dnct83hll';
    private static readonly UPLOAD_PRESET = 'avatar-upload';
    private static readonly UPLOAD_URL = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`;

    /**
     * Upload image to Cloudinary using unsigned upload preset
     */
    static async uploadImage(imageUri: string, folder: string = 'avatars', cropOptions?: {
        x: number;
        y: number;
        scale: number;
    }): Promise<string> {
        try {
            console.log('☁️ Starting Cloudinary upload for:', imageUri);

            // Create FormData for upload with timestamp
            const timestamp = Date.now();
            const fileName = `avatar_${timestamp}.jpg`;

            console.log('📁 Uploading file with name:', fileName);
            console.log('🆔 Public ID:', `avatar_${timestamp}`);

            const formData = new FormData();
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: fileName,
            } as any);
            formData.append('upload_preset', this.UPLOAD_PRESET);
            formData.append('folder', folder);
            formData.append('public_id', `avatar_${timestamp}`);
            formData.append('tags', 'avatar,profile');

            console.log('☁️ Uploading to Cloudinary...');

            const response = await fetch(this.UPLOAD_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Cloudinary response error:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('☁️ Upload successful:', result);

            if (result.secure_url) {
                // Apply square crop transformation to the URL
                // c_crop: crop mode, w_500,h_500: 500x500px, g_center: gravity center, q_80: quality 80%, f_auto: format auto
                const croppedUrl = result.secure_url.replace('/upload/', '/upload/c_crop,w_500,h_500,g_center,q_80,f_auto/');
                console.log('☁️ Original URL:', result.secure_url);
                console.log('☁️ Cropped URL:', croppedUrl);
                return croppedUrl;
            } else {
                throw new Error('No secure_url in response');
            }
        } catch (error: any) {
            console.error('❌ Cloudinary upload failed:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    /**
     * Get optimized image URL from Cloudinary
     */
    static getOptimizedImageUrl(publicId: string, options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: string;
    } = {}): string {
        const { width, height, quality = 'auto', format = 'auto' } = options;

        // Construct actual Cloudinary URL with optimizations
        const transformations = [];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        if (quality !== 'auto') transformations.push(`q_${quality}`);
        if (format !== 'auto') transformations.push(`f_${format}`);

        const transformString = transformations.length > 0 ? transformations.join(',') + '/' : '';

        return `https://res.cloudinary.com/${this.CLOUD_NAME}/image/upload/${transformString}${publicId}`;
    }

    /**
     * Extract public ID from Cloudinary URL
     */
    static extractPublicId(url: string): string | null {
        const match = url.match(/\/upload\/(?:.*\/)?(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : null;
    }
}

export default CloudinaryService;
