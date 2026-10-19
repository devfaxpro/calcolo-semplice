# Calcolo semplice

[Italiano](README.md) · **English**

A small Android app for everyday calculations, percentage discounts and proportions with guided steps. It works offline, with no account, ads or analytics services.

**Version 0.4.0** · **Android 8.0 or later** · **40 languages** · **Blue and pink themes**

## Features

- **Calculator:** addition, subtraction, multiplication and division, with parentheses, negative numbers and decimals.
- **Percentage discount:** enter an amount in euros and a discount percentage to see the savings and final price.
- **Guided proportions:** enter three directly proportional quantities to find the fourth, with a calculation breakdown.
- **Mathematical formula:** use `A : B = C : D`, choose the position of `x` and enter the other three numbers.
- **History:** revisit and reopen the last 200 calculations; clearing history requires confirmation.
- **Personalization:** choose a blue or pink theme and an interface language. Preferences are saved on the device.

Examples: **€80 − 25% = €60**, saving €20; **2 : 150 = 6 : x → x = 450**.

## Preview

<p>
  <img src="docs/screenshots/italiano.jpg" width="280" alt="Calcolo semplice interface in Italian">
  <img src="docs/screenshots/arabo.jpg" width="280" alt="Calcolo semplice interface in Arabic with right-to-left layout">
</p>

Screenshots of the interface running in a browser. They are not evidence of testing on an Android phone.

## Languages

The interface includes **40 languages**, displayed by their native names and alphabetically sorted using Italian collation. Arabic, Hebrew, Persian and Urdu use right-to-left layouts; formulas retain left-to-right mathematical order.

Several numeral systems and local decimal separators are supported. All translations are bundled with the app and available offline. See the [complete language list](docs/languages.md).

The translations have not yet undergone professional native-speaker review. Corrections and improvements are welcome.

## Open in Android Studio

1. Download the repository using **Code → Download ZIP**, or clone it:

   ```sh
   git clone https://github.com/devfaxpro/calcolo-semplice.git
   ```

2. Open the folder containing `settings.gradle` in Android Studio.
3. Select **JDK 21** for Gradle and install **Android SDK Platform 36** and **Build-Tools 36.0.0** through the SDK Manager.
4. Wait for synchronization, connect a device or start an emulator, then select **Run**.

The first build needs Internet access to download Gradle and the required tools. The installed app works offline. An up-to-date Android System WebView is required.

### Build a test APK

On Windows, from the project folder:

```powershell
.\gradlew.bat :app:assembleDebug
```

On macOS / Linux:

```sh
chmod +x gradlew
./gradlew :app:assembleDebug
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

No signing keys are included in this repository. Gradle uses a local development key, so an APK built on another computer may have a different signature from an existing installation. Updating the same app while retaining its data requires the same signing certificate. Debug builds are for testing; production distribution requires your own signing setup.

Windows users can also run `build-apk.ps1` directly with an installed Android SDK:

```powershell
.\build-apk.ps1 -Sdk 'C:/path/to/Android/Sdk' -Jdk 'C:/path/to/jdk-21'
```

Output: `build/manual/Calcolo-semplice-0.4.0-debug.apk`. This script generates a separate test key in the local `.dev-signing/` folder, which is excluded from Git.

## Tests and limitations

With Node.js 22 or later, run this from the project folder:

```sh
node --test tests/math.test.cjs
```

The suite contains 13 tests covering arithmetic, discounts, proportions, invalid input, over a thousand generated mathematical cases, translation completeness and number formats for all 40 languages. Version 0.4.0 has been built and its interface checked in a browser. Testing on a physical Android phone is still pending.

The calculation engine uses exact fractions. The calculator displays up to 10 decimal places and proportions up to 6, with an exact fraction where useful. Expressions support up to 120 characters; each number supports up to 24 integer digits and 12 decimal places. Discounts are rounded to the nearest cent.

## Data and privacy

History, theme and language are saved only in the app's local storage. The app requires no account or Internet permission and includes no trackers or ads. Uninstalling the app or clearing its data also deletes history and preferences. Browser preview data is separate from Android app data.

## Project structure

| Path | Contents |
| --- | --- |
| `app/src/main/assets/` | HTML/CSS/JavaScript interface and calculation engine |
| `app/src/main/assets/strings.js` | Catalog and translations for all 40 languages |
| `app/src/main/java/` | Java Activity and WebView serving local content |
| `app/src/main/res/` | Localized app names, icon and Android theme |
| `tests/math.test.cjs` | Automated tests |

Configuration: Gradle **8.13**, Android Gradle Plugin **8.13.2**, JDK **21**, `minSdk 26`, `compileSdk/targetSdk 36`, `versionCode 5`, package `it.calcolosemplice.app`.

## Contributions and license

When reporting a problem, include your Android version, interface language, steps to reproduce it and expected result. For translation corrections, specify the language and the text to change. Run the tests before proposing changes and do not add keys, credentials or generated files.

A license for the app's code has not yet been selected. The Gradle Wrapper retains the license notices included in its files.
