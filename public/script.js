document.addEventListener('DOMContentLoaded', async () => {
    // DOM elements
    const form = document.getElementById('templateForm');
    const mcVersionsDropdown = document.getElementById('mcVersionsDropdown');
    const mcVersionsMenu = document.getElementById('mcVersionsMenu');
    const selectedVersionsContainer = document.getElementById('selectedVersions');
    const generateButton = document.getElementById('generateButton');
    const loadingTemplateSection = document.getElementById('loading-template');
    const loaderCheckboxes = document.querySelectorAll('input[name="loaders"]');

    // Selected versions
    let selectedVersions = [];

    // Track loader compatibility
    let loaderCompatibility = {
        fabric: false,
        forge: false,
        neoforge: false
    };

    // Template data
    let templateZip = null;
    let generatedZip = null;

    // Initialize the app
    await initializeApp();

    // Event listeners
    form.addEventListener('submit', handleFormSubmit);
    mcVersionsDropdown.addEventListener('click', toggleVersionsDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.dropdown') && mcVersionsMenu.classList.contains('show')) {
            mcVersionsMenu.classList.remove('show');
        }
    });

    /**
     * Initializes the application
     */
    async function initializeApp() {
        try {
            // Start fetching Minecraft versions in the background
            const versionsPromise = fetchMinecraftVersions();

            // Wait for the template to load
            await fetchTemplate();

            // Show the form immediately after template loads
            loadingTemplateSection.classList.add('hidden');
            form.classList.remove('hidden');

            // Continue loading versions in the background
            versionsPromise.catch(error => {
                console.error('Error fetching Minecraft versions:', error);
                mcVersionsMenu.innerHTML = '<p class="error">Failed to load Minecraft versions. Please refresh the page.</p>';
            });
        } catch (error) {
            console.error('Error initializing app:', error);
            loadingTemplateSection.innerHTML = `
                <div class="error">
                    <p>Failed to initialize the application. Please refresh the page.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Fetches the template from the server
     */
    async function fetchTemplate() {
        try {
            // Load the template from our server endpoint that fetches from GitHub
            const response = await fetch('/api/template');

            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            templateZip = await JSZip.loadAsync(blob);
            console.log('Template loaded successfully');
        } catch (error) {
            console.error('Error fetching template:', error);
            throw new Error(`Failed to fetch template: ${error.message}`);
        }
    }

    /**
     * Fetches Minecraft versions and their corresponding mod loader versions
     */
    async function fetchMinecraftVersions() {
        try {
            // Show loading spinner in the dropdown
            mcVersionsMenu.innerHTML = '<div class="loading-section" style="margin: 10px; box-shadow: none;"><div class="spinner" style="width: 30px; height: 30px;"></div><p>Loading Minecraft versions...</p></div>';

            // Fetch compatible versions from our backend API
            const response = await fetch('/api/compatible-versions');

            if (!response.ok) {
                throw new Error(`Failed to fetch compatible versions: ${response.status} ${response.statusText}`);
            }

            const compatibleVersions = await response.json();

            // Clear the dropdown
            mcVersionsMenu.innerHTML = '';

            /**
             * Adds a version to the dropdown menu
             * @param {Object} version - The Minecraft version object with loaders
             * @param {boolean} isFirst - Whether this is the first version to be processed
             * @returns {HTMLElement} - The created dropdown item
             */
            function addVersionToDropdown(version, isFirst) {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.dataset.versionId = version.id;

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `mc-${version.id}`;
                input.name = 'mcVersions';
                input.value = version.id;

                // Select the latest version by default
                if (isFirst) {
                    input.checked = true;
                    item.classList.add('selected');
                }

                const label = document.createElement('label');
                label.htmlFor = `mc-${version.id}`;
                label.textContent = version.id;

                // Add loader information
                const loaderStatus = document.createElement('span');
                loaderStatus.className = 'loader-status small';
                loaderStatus.style.display = 'inline-block';
                loaderStatus.style.marginLeft = '5px';

                // Get loader versions from the version object
                const loaderVersions = version.loaders;

                // Show available loaders
                const availableLoaders = [];
                if (loaderVersions.fabric) {
                    availableLoaders.push('Fabric');
                    input.dataset.fabric = loaderVersions.fabric;

                    // Store Fabric API version if available
                    if (loaderVersions.fabricApi) {
                        input.dataset.fabricApi = loaderVersions.fabricApi;
                    }
                }
                if (loaderVersions.forge) {
                    availableLoaders.push('Forge');
                    input.dataset.forge = loaderVersions.forge;
                }
                if (loaderVersions.neoforge) {
                    availableLoaders.push('NeoForge');
                    input.dataset.neoforge = loaderVersions.neoforge;
                }
                if (loaderVersions.neoforgeFullVersion) {
                    input.dataset.neoforgeFullVersion = loaderVersions.neoforgeFullVersion;
                }

                if (availableLoaders.length > 0) {
                    loaderStatus.innerHTML = ` <small>(${availableLoaders.join(', ')})</small>`;
                }

                label.appendChild(loaderStatus);
                item.appendChild(input);
                item.appendChild(label);

                // Add event listener to handle selection
                item.addEventListener('click', (e) => {
                    // Toggle the checkbox
                    input.checked = !input.checked;

                    // Toggle the selected class
                    item.classList.toggle('selected', input.checked);

                    // Update the selected versions
                    if (input.checked) {
                        addSelectedVersion(version.id, loaderVersions);
                    } else {
                        removeSelectedVersion(version.id);
                    }

                    // Update mod loader compatibility
                    updateModLoaderCompatibility();

                    // Prevent the event from reaching the checkbox
                    e.preventDefault();
                    e.stopPropagation(); // Prevent closing the dropdown
                });

                return item;
            }

            // Update dropdown text initially
            updateDropdownText();

            // Process all versions
            let firstCompatibleVersionFound = false;

            compatibleVersions.forEach((version) => {
                // Check if this version has any compatible loaders
                const hasCompatibleLoaders = version.loaders.fabric || version.loaders.forge || version.loaders.neoforge;

                // Only add versions that have at least one compatible loader
                if (hasCompatibleLoaders) {
                    // Determine if this is the first compatible version
                    const isFirst = !firstCompatibleVersionFound;
                    if (isFirst) {
                        firstCompatibleVersionFound = true;
                    }

                    // Create the dropdown item
                    const item = addVersionToDropdown(version, isFirst);

                    // If this is the first compatible version, add it to selected versions
                    if (isFirst) {
                        addSelectedVersion(version.id, version.loaders);
                    }

                    // Add the item to the dropdown
                    mcVersionsMenu.appendChild(item);
                }
            });

            // Check if any compatible versions were found
            if (!firstCompatibleVersionFound) {
                mcVersionsMenu.innerHTML = '<p class="error">No Minecraft versions with compatible mod loaders found. Please check your connection or try again later.</p>';
            }

            // Update dropdown text and mod loader compatibility after processing
            updateDropdownText();
            updateModLoaderCompatibility();

            console.log('All Minecraft versions processed');
        } catch (error) {
            console.error('Error fetching Minecraft versions:', error);
            mcVersionsMenu.innerHTML = '<p class="error">Failed to load Minecraft versions. Please refresh the page.</p>';
        }
    }

    /**
     * Toggles the versions dropdown
     */
    function toggleVersionsDropdown(event) {
        event.stopPropagation();
        mcVersionsMenu.classList.toggle('show');

        if (mcVersionsMenu.classList.contains('show')) {
            // Position the dropdown below the button
            const rect = mcVersionsDropdown.getBoundingClientRect();
            mcVersionsMenu.style.top = `${rect.bottom}px`;
            mcVersionsMenu.style.left = `${rect.left}px`;
            mcVersionsMenu.style.width = `${rect.width}px`;
        }
    }

    /**
     * Adds a selected version to the list
     * @param {string} versionId - The Minecraft version ID
     * @param {Object} loaderVersions - The loader versions for this Minecraft version
     */
    function addSelectedVersion(versionId, loaderVersions) {
        // Check if already selected
        if (selectedVersions.some(v => v.id === versionId)) return;

        // Add to selected versions array
        selectedVersions.push({
            id: versionId,
            fabric: loaderVersions.fabric,
            fabricApi: loaderVersions.fabricApi,
            forge: loaderVersions.forge,
            neoforge: loaderVersions.neoforge,
            neoforgeFullVersion: loaderVersions.neoforgeFullVersion
        });

        // Update mod loader compatibility
        updateModLoaderCompatibility();

        // Create selected option element
        const option = document.createElement('div');
        option.className = 'selected-option';
        option.dataset.version = versionId;

        const span = document.createElement('span');
        span.textContent = versionId;

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
            // Prevent event from bubbling up to parent elements
            e.stopPropagation();

            // Use the removeSelectedVersion function which now handles both
            // the checkbox state and the dropdown item visual state
            removeSelectedVersion(versionId);
        });

        option.appendChild(span);
        option.appendChild(removeBtn);
        selectedVersionsContainer.appendChild(option);

        // Update dropdown text
        updateDropdownText();
    }

    /**
     * Removes a selected version from the list
     * @param {string} versionId - The Minecraft version ID
     */
    function removeSelectedVersion(versionId) {
        // Remove from selected versions array
        selectedVersions = selectedVersions.filter(v => v.id !== versionId);

        // Remove from DOM
        const option = selectedVersionsContainer.querySelector(`[data-version="${versionId}"]`);
        if (option) option.remove();

        // Update checkbox state and visual state in dropdown
        const checkbox = document.getElementById(`mc-${versionId}`);
        if (checkbox) {
            checkbox.checked = false;
            // Also update the parent dropdown item's visual state
            const dropdownItem = checkbox.closest('.dropdown-item');
            if (dropdownItem) {
                dropdownItem.classList.remove('selected');
            }
        }

        // Update dropdown text and mod loader compatibility
        updateDropdownText();
        updateModLoaderCompatibility();
    }

    /**
     * Updates the dropdown text based on selected versions
     */
    function updateDropdownText() {
        if (selectedVersions.length === 0) {
            mcVersionsDropdown.textContent = 'Select Minecraft Versions';
        } else if (selectedVersions.length === 1) {
            mcVersionsDropdown.textContent = `Minecraft ${selectedVersions[0].id}`;
        } else {
            mcVersionsDropdown.textContent = `${selectedVersions.length} Minecraft Versions Selected`;
        }
    }

    /**
     * Updates the mod loader compatibility based on selected versions
     * Enables/disables mod loader checkboxes accordingly
     */
    function updateModLoaderCompatibility() {
        // Reset compatibility
        loaderCompatibility = {
            fabric: false,
            forge: false,
            neoforge: false
        };

        // Check each selected version for compatibility
        selectedVersions.forEach(version => {
            if (version.fabric) loaderCompatibility.fabric = true;
            if (version.forge) loaderCompatibility.forge = true;
            if (version.neoforge) loaderCompatibility.neoforge = true;
        });

        // Update UI for each loader checkbox
        loaderCheckboxes.forEach(checkbox => {
            const loader = checkbox.value;
            const compatible = loaderCompatibility[loader];
            const checkboxItem = checkbox.closest('.checkbox-item');

            if (compatible) {
                checkbox.disabled = false;
                checkboxItem.classList.remove('incompatible');
            } else {
                checkbox.disabled = true;
                checkboxItem.classList.add('incompatible');
            }
        });
    }

    // Mod loader fetching functions have been moved to the backend

    /**
     * Handles form submission
     * @param {Event} event - The form submission event
     */
    async function handleFormSubmit(event) {
        event.preventDefault();

        // Disable button and change text to show loading state
        const originalButtonText = generateButton.textContent;
        generateButton.disabled = true;
        generateButton.classList.add('loading');
        generateButton.textContent = 'Generating template...';

        try {
            // Get form data
            const formData = new FormData(form);
            const modName = formData.get('modName');
            const modId = formData.get('modId');
            const packageName = formData.get('packageName');

            // Use the selectedVersions array that we maintain

            // Get selected mod loaders (including those that are checked but disabled)
            const selectedLoaders = Array.from(document.querySelectorAll('input[name="loaders"]:checked'))
                .map(input => input.value);

            // Validate selections
            if (selectedVersions.length === 0) {
                alert('Please select at least one Minecraft version');
                generateButton.disabled = false;
                generateButton.classList.remove('loading');
                generateButton.textContent = originalButtonText;
                return;
            }

            if (selectedLoaders.length === 0) {
                alert('Please select at least one mod loader');
                generateButton.disabled = false;
                generateButton.classList.remove('loading');
                generateButton.textContent = originalButtonText;
                return;
            }

            // Filter out disabled loaders from compatibility check
            // We only need to validate enabled loaders that are checked
            const enabledSelectedLoaders = selectedLoaders.filter(loader => {
                const checkbox = document.getElementById(loader);
                return !checkbox.disabled;
            });

            // Validate that enabled selected loaders are compatible with selected versions
            const incompatibleLoaders = enabledSelectedLoaders.filter(loader => !loaderCompatibility[loader]);
            if (incompatibleLoaders.length > 0) {
                alert(`The following mod loaders are not compatible with any of your selected Minecraft versions: ${incompatibleLoaders.join(', ')}`);
                generateButton.disabled = false;
                generateButton.classList.remove('loading');
                generateButton.textContent = originalButtonText;
                return;
            }

            // Generate the template
            await generateTemplate({
                modName,
                modId,
                packageName,
                selectedVersions,
                selectedLoaders
            });

            // Restore button state
            generateButton.disabled = false;
            generateButton.classList.remove('loading');
            generateButton.textContent = originalButtonText;

            // Show a brief success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Template generated successfully!';
            document.body.appendChild(successMessage);

            // Download the template automatically after a short delay
            setTimeout(() => {
                if (generatedZip) {
                    saveAs(generatedZip, `${modId}-template.zip`);
                }
            }, 500);

            // Remove the success message after a few seconds
            setTimeout(() => {
                successMessage.classList.add('fade-out');
                setTimeout(() => successMessage.remove(), 500);
            }, 4000);
        } catch (error) {
            console.error('Error generating template:', error);
            alert(`An error occurred while generating the template: ${error.message}`);

            // Restore button state
            generateButton.disabled = false;
            generateButton.classList.remove('loading');
            generateButton.textContent = originalButtonText;
        }
    }

    /**
     * Generates the mod template based on user inputs
     * @param {Object} options - The template options
     */
    async function generateTemplate(options) {
        if (!templateZip) {
            throw new Error('Template not loaded. Please refresh the page.');
        }

        console.log('Generating template with options:', options);

        // Create a new JSZip instance for the generated template
        const newZip = new JSZip();

        // Try to detect the root folder name
        let rootFolderName = '';

        // Check for common root folder names
        const possibleRootFolders = [
            'universal-mod-template-master',  // GitHub direct download
            'universal-mod-template-main',    // GitHub main branch
            'universal-mod-template'          // Custom zip
        ];

        // Try each possible root folder
        for (const folder of possibleRootFolders) {
            if (templateZip.files[folder + '/']) {
                rootFolderName = folder;
                break;
            }
        }

        // If none of the expected folders are found, try to detect it
        if (!rootFolderName) {
            // Find the first directory in the zip
            const firstPath = Object.keys(templateZip.files).find(path => templateZip.files[path].dir && path.split('/').length === 1);
            if (firstPath) {
                rootFolderName = firstPath.replace('/', '');
            } else {
                // Last resort: use the first file's directory
                const firstFilePath = Object.keys(templateZip.files)[0];
                rootFolderName = firstFilePath.split('/')[0];
            }
            console.log(`Using detected root folder: ${rootFolderName}`);
        }

        // Process each file in the template
        for (const [path, zipEntry] of Object.entries(templateZip.files)) {
            // Skip the root directory and directories
            if (zipEntry.dir || path === rootFolderName + '/') continue;

            // Remove the root folder from the path
            let relativePath = path.substring(rootFolderName.length + 1);

            // Skip loaders that weren't selected or are incompatible with all selected versions
            const loaderPrefixes = {
                'fabric/': options.selectedLoaders.includes('fabric') && hasCompatibleVersion('fabric', options.selectedVersions),
                'forge/': options.selectedLoaders.includes('forge') && hasCompatibleVersion('forge', options.selectedVersions),
                'neoforge/': options.selectedLoaders.includes('neoforge') && hasCompatibleVersion('neoforge', options.selectedVersions)
            };

            // Helper function to check if a loader has at least one compatible version
            function hasCompatibleVersion(loader, versions) {
                return versions.some(version => {
                    if (loader === 'fabric') return !!version.fabric;
                    if (loader === 'forge') return !!version.forge;
                    if (loader === 'neoforge') return !!version.neoforge;
                    return false;
                });
            }

            let shouldIncludeFile = true;

            // Check if file belongs to a specific loader
            for (const [prefix, include] of Object.entries(loaderPrefixes)) {
                if (relativePath.startsWith(prefix) && !include) {
                    shouldIncludeFile = false;
                    break;
                }
            }

            if (!shouldIncludeFile) continue;

            // Skip files in the versionProperties folder as we'll generate them later
            if (relativePath.startsWith('versionProperties/')) {
                continue;
            }

            // Get file content
            let content;
            try {
                content = await zipEntry.async('string');
            } catch (e) {
                // For binary files, just copy them as-is
                const binaryContent = await zipEntry.async('uint8array');
                newZip.file(relativePath, binaryContent);
                continue;
            }

            // We've already handled binary files in the try/catch block above

            // Replace package path in file path
            // Convert package name (e.g., 'com.example.mymod') to folder structure (e.g., 'com/example/mymod')
            const packagePath = options.packageName.replace(/\./g, '/');
            if (relativePath.includes('com/examplemod')) {
                relativePath = relativePath.replace('com/examplemod', packagePath);
            }

            // Replace file content

            // Replace package name in Java files
            content = content.replace(/com\.examplemod/g, options.packageName);

            // Replace package path in resource paths and other references
            content = content.replace(/com\/examplemod/g, packagePath);

            // Replace mod ID
            content = content.replace(/examplemod/g, options.modId);

            // Replace mod name
            content = content.replace(/Example Mod/g, options.modName);

            // Replace current mc version
            content = content.replace(/1\.21\.5/g, options.selectedVersions[0].id);

            // Add file to the new zip
            newZip.file(relativePath, content);
        }

        // Create versionProperties folder
        newZip.folder('versionProperties');

        // Generate version properties files for each selected version
        for (const version of options.selectedVersions) {
            const mcVersion = version.id;
            const fabricLoader = version.fabric;
            const fabricApiVersion = version.fabricApi;
            const forgeLoader = version.forge;
            const neoforgeLoader = version.neoforge;
            const neoforgeFullVersion = version.neoforgeFullVersion;

            // Determine Java version based on Minecraft version
            let javaVersion;

            // Parse version to compare numerically
            const versionParts = mcVersion.split('.');
            const majorVersion = parseInt(versionParts[0]);
            const minorVersion = parseInt(versionParts[1]);
            const patchVersion = versionParts.length > 2 ? parseInt(versionParts[2]) : 0;

            // Apply Java version requirements based on Minecraft version
            if (majorVersion < 1 || (majorVersion === 1 && minorVersion <= 5)) {
                // From pre-Classic to 1.5.2: Java 5
                // javaVersion = '5';
                javaVersion = '8'; // Cap it to 8 as the project uses JVMDowngrader which doesn't support Java 5 atm
            } else if (majorVersion === 1 && minorVersion >= 6 && minorVersion <= 11) {
                // From 1.6.1 to 1.11.2: Java 6
                // javaVersion = '6';
                javaVersion = '8'; // Cap it to 8 as the project uses JVMDowngrader which doesn't support Java 6 atm
            } else if (majorVersion === 1 && minorVersion >= 12 && minorVersion <= 16) {
                // From 1.12 to 1.16.5: Java 8
                javaVersion = '8';
            } else if (majorVersion === 1 && minorVersion === 17) {
                // 1.17.x: Java 16
                javaVersion = '16';
            } else if (majorVersion === 1 && ((minorVersion >= 18 && minorVersion <= 20 && (minorVersion !== 20 || patchVersion <= 4)))) {
                // From 1.18 to 1.20.4: Java 17
                javaVersion = '17';
            } else {
                // 1.20.5 and newer: Java 21
                javaVersion = '21';
            }

            // Create properties file content with only selected loaders
            let propertiesContent = `# General Properties
java_version=${javaVersion}
minecraft_version=${mcVersion}
compatible_mc_versions=["${mcVersion}"]
`;

            // Only include Fabric properties if Fabric is selected
            if (options.selectedLoaders.includes('fabric') && fabricLoader) {
                propertiesContent += `
# Fabric-specific Properties
fabric_loader=${fabricLoader}
fabric_api_version=${fabricApiVersion}
`;
            }

            // Only include Forge properties if Forge is selected
            if (options.selectedLoaders.includes('forge') && forgeLoader) {
                propertiesContent += `
# Forge-specific Properties
forge_loader=${forgeLoader}
`;
            }

            // Only include NeoForge properties if NeoForge is selected
            if (options.selectedLoaders.includes('neoforge') && (neoforgeLoader)) {
                propertiesContent += `
# NeoForge-specific Properties
## Unimined wants the last version number, for example, ${neoforgeFullVersion} -> ${neoforgeLoader}
neoforge_loader=${neoforgeLoader}
`;
            }

            // Add a builds_for property to indicate which loaders are selected and have valid versions
            // Filter selected loaders to only include those with valid versions for this Minecraft version
            // and are compatible with at least one selected version
            const availableLoaders = options.selectedLoaders.filter(loader => {
                // Check if this loader has a valid version for this Minecraft version
                const hasValidVersion =
                    (loader === 'fabric' && !!fabricLoader) ||
                    (loader === 'forge' && !!forgeLoader) ||
                    (loader === 'neoforge' && !!neoforgeLoader);

                // Only include loaders that have valid versions for this Minecraft version
                return hasValidVersion;
            });

            const selectedLoadersStr = availableLoaders.join(',');
            propertiesContent += `
# Selected loaders
builds_for=${selectedLoadersStr || ''}
`;

            // Add the properties file to the zip
            newZip.file(`versionProperties/${mcVersion}.properties`, propertiesContent);
        }

        // Generate the zip file
        generatedZip = await newZip.generateAsync({ type: 'blob' });
    }
});
