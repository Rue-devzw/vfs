import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// WebP magic bytes: RIFF....WEBP
const WEBP_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]);
const WEBP_FORMAT = Buffer.from([0x57, 0x45, 0x42, 0x50]);

function isWebP(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    return buffer.subarray(0, 4).equals(WEBP_RIFF) &&
        buffer.subarray(8, 12).equals(WEBP_FORMAT);
}

function configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary environment variables are not configured.');
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        if (file.type !== 'image/webp') {
            return NextResponse.json(
                { error: 'Only WebP images are allowed. Please convert your image to .webp format.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (!isWebP(buffer)) {
            return NextResponse.json(
                { error: 'File does not appear to be a valid WebP image.' },
                { status: 400 }
            );
        }

        configureCloudinary();

        // Sanitise filename (strip extension for use as public_id)
        const originalName = file.name.replace(/[^a-zA-Z0-9\-_]/g, '-');
        const publicId = `products/${originalName.replace(/\.webp$/i, '')}`;

        // Upload as a data URI so we don't need to write to disk
        const dataUri = `data:image/webp;base64,${buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(dataUri, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
            format: 'webp',
        });

        return NextResponse.json({ success: true, path: result.secure_url });
    } catch (error) {
        console.error('Image upload failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload image.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
