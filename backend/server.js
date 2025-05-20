require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

// Import Vercel Analytics, Speed Insights, and Blob storage
let analytics, speedInsights;
try {
  analytics = require('@vercel/analytics');
  speedInsights = require('@vercel/speed-insights');
} catch (error) {
  console.log('Vercel analytics modules not available in development mode');
}

// Import Blob storage functions
const blobStorage = require('./blob-storage');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Template cache
let templateCache = {
  data: null,
  lastFetched: null
};

// Version caches
let minecraftVersionsCache = {
  data: null,
  lastFetched: null
};

let fabricVersionsCache = {
  data: null,
  lastFetched: null
};

let fabricApiVersionsCache = {
  data: null,
  lastFetched: null
};

let forgeVersionsCache = {
  data: null,
  lastFetched: null
};

let neoforgeVersionsCache = {
  data: null,
  lastFetched: null
};

// Global variable for compatible versions
let compatibleVersionsCache = {
  data: null,
  lastFetched: null
};

// GitHub repository URL
const GITHUB_ZIP_URL = 'https://github.com/Ran-Mewo/universal-mod-template/archive/refs/heads/master.zip';

// Version API URLs
const MINECRAFT_VERSIONS_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
const FABRIC_GAME_VERSIONS_URL = 'https://meta.fabricmc.net/v2/versions/game';
const FABRIC_LOADER_VERSIONS_URL = 'https://meta.fabricmc.net/v2/versions/loader';
const FABRIC_API_VERSIONS_URL = 'https://api.modrinth.com/v2/project/fabric-api/version';
const FORGE_VERSIONS_URL = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';
const NEOFORGE_VERSIONS_URL = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge';

// Cache expiration time (in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Add Vercel Analytics middleware if available
if (analytics) {
  if (typeof analytics.default === 'function') {
    app.use(analytics.default());
  } else if (typeof analytics.inject === 'function') {
    app.use((req, res, next) => {
      analytics.inject();
      next();
    });
  }
}

// Add Vercel Speed Insights middleware if available
if (speedInsights) {
  if (typeof speedInsights.default === 'function') {
    app.use(speedInsights.default());
  } else if (typeof speedInsights.injectSpeedInsights === 'function') {
    app.use((req, res, next) => {
      speedInsights.injectSpeedInsights();
      next();
    });
  }
}

// Fetch template from GitHub and cache it in memory
async function fetchTemplate() {
  try {
    console.log('Fetching template from GitHub...');

    const response = await axios({
      url: GITHUB_ZIP_URL,
      method: 'GET',
      responseType: 'arraybuffer'
    });

    templateCache.data = response.data;
    templateCache.lastFetched = new Date();
    console.log(`Template fetched successfully at ${templateCache.lastFetched}`);

    // Store template in Blob storage
    await blobStorage.storeTemplate(response.data);
  } catch (error) {
    console.error('Error fetching template:', error.message);
  }
}

// Fetch Minecraft versions and cache them
async function fetchMinecraftVersions() {
  try {
    console.log('Fetching Minecraft versions...');

    const response = await axios.get(MINECRAFT_VERSIONS_URL);

    // Filter for release versions, exclude version 1.0, and sort by release date (newest first)
    const releaseVersions = response.data.versions
      .filter(version => version.type === 'release' && version.id !== '1.0')
      .sort((a, b) => new Date(b.releaseTime) - new Date(a.releaseTime));

    minecraftVersionsCache.data = releaseVersions;
    minecraftVersionsCache.lastFetched = new Date();
    console.log(`Minecraft versions fetched successfully at ${minecraftVersionsCache.lastFetched}`);
    return releaseVersions;
  } catch (error) {
    console.error('Error fetching Minecraft versions:', error.message);
    return [];
  }
}

// Fetch Fabric versions and cache them
async function fetchFabricVersions() {
  try {
    console.log('Fetching Fabric versions...');

    // Fetch game versions
    const gameResponse = await axios.get(FABRIC_GAME_VERSIONS_URL);

    // Fetch loader versions
    const loaderResponse = await axios.get(FABRIC_LOADER_VERSIONS_URL);

    // Get the latest loader version
    const latestLoader = loaderResponse.data.length > 0 ? loaderResponse.data[0].version : null;

    // Create a map of Minecraft versions to Fabric loader versions
    const fabricVersions = {};
    gameResponse.data.forEach(version => {
      if (version.stable) {
        fabricVersions[version.version] = latestLoader;
      }
    });

    fabricVersionsCache.data = fabricVersions;
    fabricVersionsCache.lastFetched = new Date();
    console.log(`Fabric versions fetched successfully at ${fabricVersionsCache.lastFetched}`);

    // Fetch Fabric API versions now since they depend on Fabric versions
    try {
      await fetchFabricApiVersions();
    } catch (apiError) {
      console.error('Error fetching Fabric API versions after Fabric versions:', apiError.message);
    }

    return fabricVersions;
  } catch (error) {
    console.error('Error fetching Fabric versions:', error.message);
    return {};
  }
}

// Fetch Forge versions and cache them
async function fetchForgeVersions() {
  try {
    console.log('Fetching Forge versions...');

    const response = await axios.get(FORGE_VERSIONS_URL);

    if (!response.data.promos) {
      forgeVersionsCache.data = {};
      forgeVersionsCache.lastFetched = new Date();
      return {};
    }

    // Create a map of Minecraft versions to Forge versions
    const forgeVersions = {};

    // Process all Forge promotions
    // Format is typically like "1.20.4-recommended" or "1.20.4-latest"
    Object.entries(response.data.promos).forEach(([key, value]) => {
      // Extract the Minecraft version from the key
      const mcVersionMatch = key.match(/^([0-9.]+)-(recommended|latest)$/);
      if (mcVersionMatch) {
        const mcVersion = mcVersionMatch[1];
        const isRecommended = mcVersionMatch[2] === 'recommended';

        // Extract just the Forge version number (e.g., "49.0.3" from "1.20.4-49.0.3")
        const forgeVersionMatch = value.match(/^[0-9.]+-([0-9.]+)$/);
        const forgeVersion = forgeVersionMatch ? forgeVersionMatch[1] : value;

        // Prefer recommended versions, but use latest if no recommended exists
        if (isRecommended || !forgeVersions[mcVersion]) {
          forgeVersions[mcVersion] = forgeVersion;
        }
      }
    });

    forgeVersionsCache.data = forgeVersions;
    forgeVersionsCache.lastFetched = new Date();
    console.log(`Forge versions fetched successfully at ${forgeVersionsCache.lastFetched}`);
    return forgeVersions;
  } catch (error) {
    console.error('Error fetching Forge versions:', error.message);
    return {};
  }
}

// Fetch NeoForge versions and cache them
async function fetchNeoForgeVersions() {
  try {
    console.log('Fetching NeoForge versions...');

    const response = await axios.get(NEOFORGE_VERSIONS_URL);

    if (!response.data.versions || response.data.versions.length === 0) {
      neoforgeVersionsCache.data = {};
      neoforgeVersionsCache.lastFetched = new Date();
      return {};
    }

    // Create a map of Minecraft versions to NeoForge versions
    const neoforgeVersions = {};

    // Process all NeoForge versions
    response.data.versions.forEach(version => {
      // Extract the Minecraft version from the NeoForge version
      // Format is typically like "20.4.72" where "20.4" is the MC version without the "1." prefix
      // For versions like "1.21", NeoForge adds a ".0" suffix, making it "21.0.X"
      const parts = version.split('.');
      if (parts.length >= 3) { // We need at least 3 parts for a valid NeoForge version
        // Reconstruct the Minecraft version (add "1." prefix)
        // For versions like "21.0.X", we need to convert back to "1.21"
        let mcVersion;
        if (parts[1] === '0') {
          // This is a two-segment Minecraft version (e.g., "1.21")
          mcVersion = `1.${parts[0]}`;
        } else {
          // This is a three-segment Minecraft version (e.g., "1.20.4")
          mcVersion = `1.${parts[0]}.${parts[1]}`;
        }

        // Extract the NeoForge version number (last part)
        const neoforgeVersion = parts[parts.length - 1];

        // Store the latest NeoForge version for this Minecraft version
        if (!neoforgeVersions[mcVersion] ||
            parseInt(neoforgeVersion) > parseInt(neoforgeVersions[mcVersion].version)) {
          neoforgeVersions[mcVersion] = {
            version: neoforgeVersion,
            fullVersion: version
          };
        }
      }
    });

    neoforgeVersionsCache.data = neoforgeVersions;
    neoforgeVersionsCache.lastFetched = new Date();
    console.log(`NeoForge versions fetched successfully at ${neoforgeVersionsCache.lastFetched}`);
    return neoforgeVersions;
  } catch (error) {
    console.error('Error fetching NeoForge versions:', error.message);
    return {};
  }
}

// Get mod loader versions for a specific Minecraft version
function getModLoaderVersions(mcVersion, fabricVersions, fabricApiVersions, forgeVersions, neoforgeVersions) {
  try {
    // Get Fabric version for this Minecraft version
    const fabricVersion = fabricVersions[mcVersion] || null;

    // Get Fabric API version for this Minecraft version
    const fabricApiVersion = fabricApiVersions[mcVersion] || null;

    // Get Forge version for this Minecraft version
    const forgeVersion = forgeVersions[mcVersion] || null;

    // Get NeoForge version for this Minecraft version
    const neoforgeData = neoforgeVersions[mcVersion] || { version: null, fullVersion: null };
    const neoforgeVersion = neoforgeData.version;
    const neoforgeFullVersion = neoforgeData.fullVersion;

    // Return the versions
    return {
      fabric: fabricVersion,
      fabricApi: fabricApiVersion,
      forge: forgeVersion,
      neoforge: neoforgeVersion,
      neoforgeFullVersion: neoforgeFullVersion
    };
  } catch (error) {
    console.error(`Error getting mod loader versions for ${mcVersion}:`, error.message);
    return {
      fabric: null,
      fabricApi: null,
      forge: null,
      neoforge: null,
      neoforgeFullVersion: null
    };
  }
}

// Fetch Fabric API versions and cache them
async function fetchFabricApiVersions() {
  try {
    console.log('Fetching Fabric API versions...');

    const response = await axios.get(FABRIC_API_VERSIONS_URL);

    if (!response.data || !Array.isArray(response.data)) {
      fabricApiVersionsCache.data = {};
      fabricApiVersionsCache.lastFetched = new Date();
      return {};
    }

    // Create a map of Minecraft versions to Fabric API versions
    const fabricApiVersions = {};

    // Create a list of all Fabric API versions with their supported Minecraft versions
    const allFabricApiVersions = [];

    // Process all Fabric API versions
    response.data.forEach(version => {
      // Check if this is a release version
      if (version.version_type === 'release') {
        // Get the game versions this Fabric API version supports
        const gameVersions = version.game_versions || [];

        // Get the version number
        const versionNumber = version.version_number;

        // For each supported game version, store this as a potential Fabric API version
        gameVersions.forEach(gameVersion => {
          // Only store the latest version for each Minecraft version
          // We're iterating from newest to oldest since Modrinth returns them in that order
          if (!fabricApiVersions[gameVersion]) {
            fabricApiVersions[gameVersion] = versionNumber;
          }

          // Add to our list of all versions for fallback mechanism
          allFabricApiVersions.push({
            mcVersion: gameVersion,
            apiVersion: versionNumber
          });
        });
      }
    });

    // Helper function to compare Minecraft versions semantically
    function compareVersions(a, b) {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;

        if (aVal !== bVal) {
          return bVal - aVal; // Descending order (newest first)
        }
      }

      return 0;
    }

    // Sort all versions by Minecraft version (semantically, newest first)
    allFabricApiVersions.sort((a, b) => compareVersions(a.mcVersion, b.mcVersion));

    // Get all Minecraft versions with Fabric Loader support
    // Use the cached data if available
    const fabricVersions = fabricVersionsCache.data || {};

    // For each Minecraft version with Fabric Loader support but no API version,
    // find the most recent compatible Fabric API version
    Object.keys(fabricVersions).forEach(mcVersion => {
      if (!fabricApiVersions[mcVersion]) {
        // Find the most recent Fabric API version that supports a Minecraft version
        // older than or equal to the target version
        const fallbackVersion = allFabricApiVersions.find(v => {
          // Compare versions semantically
          const vParts = v.mcVersion.split('.').map(Number);
          const mcParts = mcVersion.split('.').map(Number);

          // Check if v.mcVersion is older than or equal to mcVersion
          for (let i = 0; i < Math.max(vParts.length, mcParts.length); i++) {
            const vVal = vParts[i] || 0;
            const mcVal = mcParts[i] || 0;

            if (vVal !== mcVal) {
              return vVal <= mcVal; // v.mcVersion is older than or equal to mcVersion
            }
          }

          return true; // Versions are equal
        });

        if (fallbackVersion) {
          fabricApiVersions[mcVersion] = fallbackVersion.apiVersion;
          console.log(`Using fallback Fabric API version ${fallbackVersion.apiVersion} from ${fallbackVersion.mcVersion} for Minecraft ${mcVersion}`);
        }
      }
    });

    fabricApiVersionsCache.data = fabricApiVersions;
    fabricApiVersionsCache.lastFetched = new Date();
    console.log(`Fabric API versions fetched successfully at ${fabricApiVersionsCache.lastFetched}`);
    return fabricApiVersions;
  } catch (error) {
    console.error('Error fetching Fabric API versions:', error.message);
    return {};
  }
}

// Function to generate compatible versions
function generateCompatibleVersions() {
  try {
    // Get Minecraft versions from cache
    const mcVersions = minecraftVersionsCache.data || [];
    const fabricVersions = fabricVersionsCache.data || {};
    const fabricApiVersions = fabricApiVersionsCache.data || {};
    const forgeVersions = forgeVersionsCache.data || {};
    const neoforgeVersions = neoforgeVersionsCache.data || {};

    // Process each Minecraft version to add loader compatibility
    return mcVersions.map(version => {
      const loaderVersions = getModLoaderVersions(
        version.id,
        fabricVersions,
        fabricApiVersions,
        forgeVersions,
        neoforgeVersions
      );

      return {
        ...version,
        loaders: loaderVersions
      };
    });
  } catch (error) {
    console.error('Error generating compatible versions:', error.message);
    return [];
  }
}

// Fetch all versions on server start
async function fetchAllVersions() {
  try {
    // Fetch all versions in parallel
    await Promise.all([
      fetchMinecraftVersions(),
      fetchFabricVersions(), // fetchFabricVersions will also fetch Fabric API versions
      fetchForgeVersions(),
      fetchNeoForgeVersions()
    ]);

    console.log('All versions fetched successfully');

    // Generate compatible versions and update the cache
    compatibleVersionsCache.data = generateCompatibleVersions();
    compatibleVersionsCache.lastFetched = new Date();
    console.log(`Compatible versions generated at ${compatibleVersionsCache.lastFetched}`);
    console.log('Compatible versions:', compatibleVersionsCache.data);

    // Store compatible versions in Blob storage without awaiting
    await blobStorage.storeCompatibleVersions(compatibleVersionsCache.data);
  } catch (error) {
    console.error('Error fetching all versions:', error.message);
  }
}

// Fetch the template on server start
fetchTemplate().then(_ => {
  setInterval(fetchTemplate, CACHE_EXPIRATION);
});

// Fetch all versions on server start
fetchAllVersions().then(_ => {
  setInterval(fetchAllVersions, CACHE_EXPIRATION);
});

// Serve the template zip file
app.get('/api/template', async (req, res) => {
  // Only fetch if the template is not available at all
  if (!templateCache.data) {
    await fetchTemplate();
  }

  if (templateCache.data) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="universal-mod-template.zip"');
    return res.send(templateCache.data);
  }
  return res.status(503).json({ error: 'Template not available. Please try again later.' });
});

// API endpoint to get Minecraft versions
app.get('/api/minecraft-versions', async (req, res) => {
  try {
    // If cache is empty, trigger a fetch
    if (!minecraftVersionsCache.data) {
      await fetchMinecraftVersions();
    }

    if (!minecraftVersionsCache.data) {
      return res.status(503).json({ error: 'Failed to fetch Minecraft versions. Please try again later.' });
    }

    return res.json(minecraftVersionsCache.data);
  } catch (error) {
    console.error('Error serving Minecraft versions:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all mod loader versions for all Minecraft versions
app.get('/api/mod-loader-versions', async (req, res) => {
  try {
    // If any cache is empty, trigger a fetch of all versions
    if (!fabricVersionsCache.data || !fabricApiVersionsCache.data ||
        !forgeVersionsCache.data || !neoforgeVersionsCache.data) {
      await fetchAllVersions();
    }

    // Return all mod loader versions from cache
    return res.json({
      fabric: fabricVersionsCache.data || {},
      fabricApi: fabricApiVersionsCache.data || {},
      forge: forgeVersionsCache.data || {},
      neoforge: neoforgeVersionsCache.data || {}
    });
  } catch (error) {
    console.error('Error serving mod loader versions:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get compatible versions (Minecraft versions with their compatible mod loaders)
app.get('/api/compatible-versions', async (req, res) => {
  try {
    // If any cache is empty, trigger a fetch of all versions
    if (!minecraftVersionsCache.data || !fabricVersionsCache.data ||
        !fabricApiVersionsCache.data || !forgeVersionsCache.data ||
        !neoforgeVersionsCache.data || !compatibleVersionsCache.data) {
      await fetchAllVersions();
    }

    // Return the cached compatible versions
    return res.json(compatibleVersionsCache.data);
  } catch (error) {
    console.error('Error serving compatible versions:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start the server if not being imported (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel serverless functions
module.exports = app;
