import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getStorageBucket } from '@/lib/firebase-admin';

// WebP magic bytes: RIFF....WEBP
const WEBP_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]);
const WEBP_FORMAT = Buffer.from([0x57, 0x45, 0x42, 0x50]);

function isWebP(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    return buffer.subarray(0, 4).equals(WEBP_RIFF) &&
        buffer.subarray(8, 12).equals(WEBP_FORMAT);
}



export async function POST(req: Request) {
    try {
        const session = await verifyAdminSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        // Sanitise filename
        const originalName = file.name.replace(/[^a-zA-Z0-9\-_]/g, '-');
        const filename = `${originalName.replace(/\.webp$/i, '')}-${Date.now()}.webp`;
        const filePath = `products/${filename}`;

        // Get initialized bucket
        const bucket = getStorageBucket();
        const fileRef = bucket.file(filePath);

        // Upload buffer to Firebase Storage
        await fileRef.save(buffer, {
            metadata: {
                contentType: 'image/webp',
            },
            public: true, // Make file publicly readable
        });

        // Generate public URL for the file
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        return NextResponse.json({ success: true, path: publicUrl });
    } catch (error) {
        console.error('Image upload failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload image.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
