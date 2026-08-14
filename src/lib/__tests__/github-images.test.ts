import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GITHUB_IMAGE_FOLDER,
  uploadProductImageToGitHub,
} from "@/lib/github-images";

describe("uploadProductImageToGitHub", () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_IMAGE_TOKEN = "test-token";
    process.env.GITHUB_IMAGE_REPOSITORY = "Rue-devzw/vfs-product-images";
    delete process.env.GITHUB_IMAGE_FOLDER;
    delete process.env.GITHUB_IMAGE_BRANCH;
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.restoreAllMocks();
  });

  it("commits the image to a separate repository and returns a commit-pinned URL", async () => {
    const commitSha = "a".repeat(40);
    const githubFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: {
        download_url: "https://raw.githubusercontent.com/Rue-devzw/vfs-product-images/main/products/beans.webp",
      },
      commit: {
        sha: commitSha,
        html_url: `https://github.com/Rue-devzw/vfs-product-images/commit/${commitSha}`,
      },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));

    const result = await uploadProductImageToGitHub(
      Buffer.from("webp-image"),
      "beans.webp",
      githubFetch,
    );

    expect(githubFetch).toHaveBeenCalledWith(
      `https://api.github.com/repos/Rue-devzw/vfs-product-images/contents/${DEFAULT_GITHUB_IMAGE_FOLDER}/beans.webp`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
    const request = githubFetch.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      message: "Add product image beans.webp",
      content: Buffer.from("webp-image").toString("base64"),
    });
    expect(result).toEqual({
      downloadUrl: `https://raw.githubusercontent.com/Rue-devzw/vfs-product-images/${commitSha}/products/beans.webp`,
      repositoryPath: "products/beans.webp",
      commitUrl: `https://github.com/Rue-devzw/vfs-product-images/commit/${commitSha}`,
    });
  });

  it("uses a configured repository, folder, and branch", async () => {
    process.env.GITHUB_IMAGE_REPOSITORY = "shop/assets";
    process.env.GITHUB_IMAGE_FOLDER = "/catalog/images/";
    process.env.GITHUB_IMAGE_BRANCH = "media";
    const githubFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: { download_url: "https://raw.githubusercontent.com/shop/assets/media/catalog/images/item.webp" },
      commit: { sha: "b".repeat(40) },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));

    await uploadProductImageToGitHub(Buffer.from("image"), "item.webp", githubFetch);

    const request = githubFetch.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual(expect.objectContaining({ branch: "media" }));
    expect(githubFetch.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/shop/assets/contents/catalog/images/item.webp",
    );
  });

  it("reports GitHub API errors without exposing the token", async () => {
    const githubFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "Resource not accessible by personal access token" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ));

    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp", githubFetch))
      .rejects.toThrow("GitHub image upload failed (403): Resource not accessible by personal access token");
    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp", githubFetch))
      .rejects.not.toThrow("test-token");
  });

  it("requires the GitHub token", async () => {
    delete process.env.GITHUB_IMAGE_TOKEN;

    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp"))
      .rejects.toThrow("Set GITHUB_IMAGE_TOKEN");
  });

  it("requires a repository separate from the application", async () => {
    delete process.env.GITHUB_IMAGE_REPOSITORY;

    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp"))
      .rejects.toThrow("Set GITHUB_IMAGE_REPOSITORY to a separate public image repository");

    process.env.GITHUB_IMAGE_REPOSITORY = "Rue-devzw/vfs";
    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp"))
      .rejects.toThrow("must not be the application repository");
  });

  it("requires a commit SHA so stored URLs are immutable", async () => {
    const githubFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      content: { download_url: "https://raw.githubusercontent.com/Rue-devzw/vfs-product-images/main/products/item.webp" },
      commit: { html_url: "https://github.com/Rue-devzw/vfs-product-images/commit/missing-sha" },
    }), { status: 201, headers: { "Content-Type": "application/json" } }));

    await expect(uploadProductImageToGitHub(Buffer.from("image"), "item.webp", githubFetch))
      .rejects.toThrow("did not return a valid commit SHA");
  });
});
