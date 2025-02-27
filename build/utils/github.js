import fetch from "node-fetch";
/**
 * Utility to detect if a string is a URL
 * @param str String to check
 * @returns true if the string is a valid URL
 */
export function isUrl(str) {
    try {
        new URL(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Get the npm package documentation URL
 * @param packageName Name of the npm package
 * @returns URL of the npm package page
 */
export function getNpmPackageUrl(packageName) {
    return `https://www.npmjs.com/package/${packageName}`;
}
/**
 * Get package URL for different package repositories based on language
 * @param packageName Name of the package
 * @param language Programming language or repository type
 * @returns URL of the package documentation page
 */
export function getPackageUrl(packageName, language = "javascript") {
    const lang = language.toLowerCase().trim();
    switch (lang) {
        // JavaScript/TypeScript
        case "javascript":
        case "js":
        case "typescript":
        case "ts":
        case "node":
        case "nodejs":
        case "npm":
            return `https://www.npmjs.com/package/${packageName}`;
        // Python
        case "python":
        case "py":
        case "pypi":
            return `https://pypi.org/project/${packageName}`;
        // Java
        case "java":
        case "maven":
            return `https://mvnrepository.com/artifact/${packageName}`;
        // .NET
        case "dotnet":
        case ".net":
        case "csharp":
        case "c#":
        case "nuget":
            return `https://www.nuget.org/packages/${packageName}`;
        // Ruby
        case "ruby":
        case "gem":
        case "rubygem":
        case "rubygems":
            return `https://rubygems.org/gems/${packageName}`;
        // PHP
        case "php":
        case "composer":
        case "packagist":
            return `https://packagist.org/packages/${packageName}`;
        // Rust
        case "rust":
        case "cargo":
        case "crate":
        case "crates":
            return `https://crates.io/crates/${packageName}`;
        // Go
        case "go":
        case "golang":
            return `https://pkg.go.dev/${packageName}`;
        // Swift
        case "swift":
        case "cocoapods":
            return `https://cocoapods.org/pods/${packageName}`;
        // Default to npm
        default:
            return `https://www.npmjs.com/package/${packageName}`;
    }
}
/**
 * Get the GitHub repository URL for an npm package
 * @param packageName Name of the npm package
 * @returns GitHub repository URL, or null if not found
 */
export async function getGitHubRepoUrl(packageName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${packageName}`);
        const data = (await response.json());
        // Try to get GitHub URL from repository field
        if (data.repository &&
            typeof data.repository === "object" &&
            data.repository.url) {
            const repoUrl = data.repository.url;
            if (repoUrl.includes("github.com")) {
                return repoUrl
                    .replace("git+", "")
                    .replace("git://", "https://")
                    .replace(".git", "");
            }
        }
        // Try to get GitHub URL from homepage field
        if (data.homepage &&
            typeof data.homepage === "string" &&
            data.homepage.includes("github.com")) {
            return data.homepage;
        }
        return null;
    }
    catch (error) {
        console.error(`Error fetching GitHub repo URL for ${packageName}:`, error);
        return null;
    }
}
/**
 * Extract library name from URL
 * @param url URL to extract library name from
 * @returns Library name
 */
export function extractLibraryName(url) {
    let libraryName = url;
    if (url.includes("npmjs.com/package/")) {
        libraryName = url.split("/package/")[1].split("/")[0];
    }
    else if (url.includes("pypi.org/project/")) {
        libraryName = url.split("/project/")[1].split("/")[0];
    }
    else if (url.includes("nuget.org/packages/")) {
        libraryName = url.split("/packages/")[1].split("/")[0];
    }
    else if (url.includes("rubygems.org/gems/")) {
        libraryName = url.split("/gems/")[1].split("/")[0];
    }
    else if (url.includes("packagist.org/packages/")) {
        libraryName = url.split("/packages/")[1].split("/")[0];
    }
    else if (url.includes("crates.io/crates/")) {
        libraryName = url.split("/crates/")[1].split("/")[0];
    }
    else if (url.includes("pkg.go.dev/")) {
        libraryName = url.split("pkg.go.dev/")[1].split("/")[0];
    }
    else if (url.includes("cocoapods.org/pods/")) {
        libraryName = url.split("/pods/")[1].split("/")[0];
    }
    else if (url.includes("mvnrepository.com/artifact/")) {
        libraryName = url.split("/artifact/")[1].split("/")[0];
    }
    else if (url.includes("github.com")) {
        const parts = url.split("github.com/")[1].split("/");
        if (parts.length >= 2) {
            libraryName = parts[1];
        }
    }
    return libraryName;
}
