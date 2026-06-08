# expo-adi-registration

An Expo config plugin that copies `adi-registration.properties` into the native Android assets directory for Google Play Console package ownership verification.

---

## The Problem

Google Play Console requires a signed APK containing `adi-registration.properties` in the **native Android assets directory**. Expo's JavaScript asset bundling does not place files there automatically — this plugin does it for you.

---

## Installation

```bash
npm install expo-adi-registration
```

---

## Usage

You have two ways to use this plugin:

### Option A — Pass the token directly in `app.config.js` (recommended)

```js
export default {
  expo: {
    plugins: [
      ["expo-adi-registration", { "token": "YOUR_TOKEN_FROM_GOOGLE_PLAY_CONSOLE" }]
    ]
  }
}
```

### Option B — Place the file in your `assets/` folder

1. Create a file named `adi-registration.properties` inside your project's `assets/` folder
2. Paste your token snippet from Google Play Console inside the file
3. Add the plugin to your `app.config.js`:

```js
export default {
  expo: {
    plugins: [
      "expo-adi-registration"
    ]
  }
}
```

---

## Build

After adding the plugin, build a release APK using EAS:

```bash
eas build -p android --profile preview
```

Then upload the generated `.apk` to Google Play Console to complete ownership verification.

---

## How It Works

The plugin runs during the EAS build process and copies `adi-registration.properties` into:

```
android/app/src/main/assets/adi-registration.properties
```

This is the native Android assets path that Google Play Console checks when verifying package ownership.

---

## Requirements

- Expo SDK 49 or higher
- EAS Build

---

## License

MIT