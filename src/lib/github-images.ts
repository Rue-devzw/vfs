const GITHUB_API_VERSION = "2022-11-28";

const APPLICATION_REPOSITORY = "Rue-devzw/vfs";
export const DEFAULT_GITHUB_IMAGE_FOLDER = "products";

type GitHubContentsResponse = {
  content?: {
    download_url?: string | null;
  };
  commit?: {
    html_url?: string;
    sha?: string;
  };
  message?: string;
};

export type GitHubImageUploadResult = {
  downloadUrl: string;
  repositoryPath: string;
  commitUrl?: string;
};

function normaliseRepository(repository: string): string {
  const value = repository.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "");

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("GITHUB_IMAGE_REPOSITORY must use the owner/repository format.");
  }

  return value;
}

function normaliseFolder(folder: string): string {
  const value = folder.trim().replace(/^\/+|\/+$/g, "");
  const segments = value.split("/").filter(Boolean);

  if (segments.length === 0 || segments.some(segment => segment === "." || segment === "..")) {
    throw new Error("GITHUB_IMAGE_FOLDER must be a valid repository folder.");
  }

  return segments.join("/");
}

function encodeRepositoryPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function uploadProductImageToGitHub(
  buffer: Buffer,
  filename: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<GitHubImageUploadResult> {
  const token = process.env.GITHUB_IMAGE_TOKEN?.trim();
  if (!token) {
    throw new Error("GitHub image storage is not configured. Set GITHUB_IMAGE_TOKEN.");
  }

  const configuredRepository = process.env.GITHUB_IMAGE_REPOSITORY?.trim();
  if (!configuredRepository) {
    throw new Error(
      "GitHub image storage is not isolated. Set GITHUB_IMAGE_REPOSITORY to a separate public image repository.",
    );
  }

  const repository = normaliseRepository(configuredRepository);
  if (repository.toLowerCase() === APPLICATION_REPOSITORY.toLowerCase()) {
    throw new Error(
      `GITHUB_IMAGE_REPOSITORY must not be the application repository (${APPLICATION_REPOSITORY}). Use a separate public image repository.`,
    );
  }
  const folder = normaliseFolder(
    process.env.GITHUB_IMAGE_FOLDER || DEFAULT_GITHUB_IMAGE_FOLDER,
  );
  const repositoryPath = `${folder}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${repository}/contents/${encodeRepositoryPath(repositoryPath)}`;
  const branch = process.env.GITHUB_IMAGE_BRANCH?.trim();

  const response = await fetchImplementation(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    body: JSON.stringify({
      message: `Add product image ${filename}`,
      content: buffer.toString("base64"),
      ...(branch ? { branch } : {}),
    }),
    cache: "no-store",
  });

  const responseBody = await response.json().catch(() => ({})) as GitHubContentsResponse;

  if (!response.ok) {
    const detail = responseBody.message ? `: ${responseBody.message}` : "";
    throw new Error(`GitHub image upload failed (${response.status})${detail}`);
  }

  const commitSha = responseBody.commit?.sha;
  if (!commitSha || !/^[a-f0-9]{40}$/i.test(commitSha)) {
    throw new Error("GitHub uploaded the image but did not return a valid commit SHA.");
  }

  // Pin the URL to the upload commit. Later branch changes and deployments cannot
  // alter the bytes referenced by an existing product record.
  const downloadUrl = `https://raw.githubusercontent.com/${repository}/${commitSha}/${encodeRepositoryPath(repositoryPath)}`;

  return {
    downloadUrl,
    repositoryPath,
    commitUrl: responseBody.commit?.html_url,
  };
}
