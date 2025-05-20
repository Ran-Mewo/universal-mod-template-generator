const { put } = require('@vercel/blob');

// Blob storage configuration
const BLOB_ACCESS = 'public';
const BLOB_PREFIX = 'universal-mod-template-generator/';

// Blob names for different data types
const BLOB_NAMES = {
  MINECRAFT_VERSIONS: `${BLOB_PREFIX}minecraft-versions.json`,
  FABRIC_VERSIONS: `${BLOB_PREFIX}fabric-versions.json`,
  FABRIC_API_VERSIONS: `${BLOB_PREFIX}fabric-api-versions.json`,
  FORGE_VERSIONS: `${BLOB_PREFIX}forge-versions.json`,
  NEOFORGE_VERSIONS: `${BLOB_PREFIX}neoforge-versions.json`,
  COMPATIBLE_VERSIONS: `${BLOB_PREFIX}compatible-versions.json`,
  TEMPLATE: `${BLOB_PREFIX}template.zip`
};

/**
 * Stores data in Vercel Blob storage
 * @param {string} blobName - The name of the blob
 * @param {object} data - The data to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeDataInBlob(blobName, data) {
  try {
    console.log(`Storing data in Blob: ${blobName}`);
    const { url } = await put(blobName, JSON.stringify(data), { access: BLOB_ACCESS });
    console.log(`Data stored successfully in Blob: ${blobName}, URL: ${url}`);
    return url;
  } catch (error) {
    console.error(`Error storing data in Blob ${blobName}:`, error.message);
    return null;
  }
}

/**
 * Stores Minecraft versions in Blob storage
 * @param {Array} versions - The Minecraft versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeMinecraftVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.MINECRAFT_VERSIONS, versions);
}

/**
 * Stores Fabric versions in Blob storage
 * @param {object} versions - The Fabric versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeFabricVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.FABRIC_VERSIONS, versions);
}

/**
 * Stores Fabric API versions in Blob storage
 * @param {object} versions - The Fabric API versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeFabricApiVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.FABRIC_API_VERSIONS, versions);
}

/**
 * Stores Forge versions in Blob storage
 * @param {object} versions - The Forge versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeForgeVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.FORGE_VERSIONS, versions);
}

/**
 * Stores NeoForge versions in Blob storage
 * @param {object} versions - The NeoForge versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeNeoForgeVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.NEOFORGE_VERSIONS, versions);
}

/**
 * Stores compatible versions in Blob storage
 * @param {Array} versions - The compatible versions to store
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeCompatibleVersions(versions) {
  return storeDataInBlob(BLOB_NAMES.COMPATIBLE_VERSIONS, versions);
}

/**
 * Stores template zip file in Blob storage
 * @param {Buffer} templateData - The template zip file data
 * @returns {Promise<string>} - The URL of the stored blob
 */
async function storeTemplate(templateData) {
  try {
    console.log(`Storing template in Blob: ${BLOB_NAMES.TEMPLATE}`);
    const { url } = await put(BLOB_NAMES.TEMPLATE, templateData, { access: BLOB_ACCESS });
    console.log(`Template stored successfully in Blob: ${BLOB_NAMES.TEMPLATE}, URL: ${url}`);
    return url;
  } catch (error) {
    console.error(`Error storing template in Blob ${BLOB_NAMES.TEMPLATE}:`, error.message);
    return null;
  }
}

module.exports = {
  storeMinecraftVersions,
  storeFabricVersions,
  storeFabricApiVersions,
  storeForgeVersions,
  storeNeoForgeVersions,
  storeCompatibleVersions,
  storeTemplate,
  BLOB_NAMES
};
