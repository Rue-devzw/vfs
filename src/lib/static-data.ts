export async function getStaticData<T>(jsonPath: string): Promise<T[]> {
    const isServer = typeof window === 'undefined';

    if (isServer) {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', jsonPath);

        try {
            const fileContents = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContents);
        } catch (error) {
            console.error(`Error reading static data from ${filePath}:`, error);
            return [];
        }
    } else {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching static data from ${jsonPath}:`, error);
            return [];
        }
    }
}
