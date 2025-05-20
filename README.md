# Universal Minecraft Mod Template Generator

A Node.js application that generates customized Minecraft mod templates for multiple mod loaders (Fabric, Forge, NeoForge) and Minecraft versions.

## How to Use

1. Visit the website
2. Fill in your mod details:
   - Mod Name
   - Mod ID (lowercase letters, numbers, and underscores only)
   - Package Name (valid Java package name)
3. Select the Minecraft versions you want to support
4. Select the mod loaders you want to support
5. Click "Generate Template"
6. Download your customized template

## Development

This is a Node.js application with Firebase integration.

### Technologies Used

- Node.js and Express
- Firebase (Hosting)
- HTML/CSS/JavaScript
- [JSZip](https://stuk.github.io/jszip/) - For handling ZIP files
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - For downloading files

### Local Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and fill in your Firebase credentials
4. Run the development server: `npm run dev`
5. Open `http://localhost:3000` in your browser

### Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Deploy to Firebase: `npm run deploy`

### Updating the Template

The template is automatically updated every 24 hours and fetched from GitHub.

## Acknowledgments

- [Ran-Mewo/universal-mod-template](https://github.com/Ran-Mewo/universal-mod-template) - The base template used by this generator
