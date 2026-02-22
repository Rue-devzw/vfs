import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// WebP file signature (magic bytes)
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
const WEBP_FORMAT = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP (at bytes 8-12)

function isWebP(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    const riff = buffer.subarray(0, 4);
    const webp = buffer.subarray(8, 12);
    return riff.equals(WEBP_MAGIC) && webp.equals(WEBP_FORMAT);
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        // Validate file type by MIME
        if (file.type !== 'image/webp') {
            return NextResponse.json(
                { error: 'Only WebP images are allowed. Please convert your image to .webp format.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate magic bytes
        if (!isWebP(buffer)) {
            return NextResponse.json(
                { error: 'File does not appear to be a valid WebP image.' },
                { status: 400 }
            );
        }

        // Sanitize filename and ensure .webp extension
        const originalName = file.name.replace(/[^a-zA-Z0-9\-_.]/g, '-');
        const baseName = originalName.replace(/\.webp$/i, '');
        const filename = `${baseName}.webp`;

        const imagesDir = join(process.cwd(), 'public', 'images');
        await mkdir(imagesDir, { recursive: true });

        const filePath = join(imagesDir, filename);
        await writeFile(filePath, buffer);

        const publicPath = `/images/${filename}`;
        return NextResponse.json({ success: true, path: publicPath });
    } catch (error) {
        console.error('Image upload failed:', error);
        return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
    }
}
