import { NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth';
import { uploadProductImageToGitHub } from '@/lib/github-images';
import { randomUUID } from 'node:crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
        try {
            await requireStaffPermission("products.edit");
        } catch {
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

        if (file.size > MAX_IMAGE_BYTES) {
            return NextResponse.json(
                { error: 'Image is too large. The maximum upload size is 10 MB.' },
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

        const baseName = file.name
            .replace(/\.webp$/i, '')
            .replace(/[^a-zA-Z0-9\-_]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'product';
        const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
        const upload = await uploadProductImageToGitHub(buffer, filename);

        return NextResponse.json({
            success: true,
            path: upload.downloadUrl,
            repositoryPath: upload.repositoryPath,
            commitUrl: upload.commitUrl,
        });
    } catch (error) {
        console.error('Image upload failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload image.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
