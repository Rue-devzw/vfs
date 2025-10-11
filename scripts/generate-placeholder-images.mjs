import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const imagesDir = path.join(rootDir, 'public', 'images');

const slugify = (value) => {
  return value
    .normalize('NFKD')
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

const humanize = (value) => {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const files = fs
  .readdirSync(imagesDir)
  .filter((file) => file.toLowerCase().endsWith('.webp'))
  .sort((a, b) => a.localeCompare(b, 'en'));

const placeholders = files.map((file) => {
  const baseName = path.parse(file).name;
  const id = slugify(baseName);
  const encodedFile = encodeURIComponent(file);
  const description = `Image for ${humanize(baseName)}`;
  const imageHint = humanize(baseName);

  return {
    id,
    description,
    imageUrl: `/images/${encodedFile}`,
    imageHint,
  };
});

const data = { placeholderImages: placeholders };

const outputPath = path.join(rootDir, 'src', 'lib', 'placeholder-images.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');
