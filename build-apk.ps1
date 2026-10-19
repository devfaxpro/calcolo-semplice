param(
 [string]$Sdk = "$env:LOCALAPPDATA/Android/Sdk",
 [string]$Jdk = 'C:/Program Files/Android/Android Studio/jbr'
)
$ErrorActionPreference='Stop'
$env:JAVA_HOME=$Jdk
$bt=Join-Path $Sdk 'build-tools/36.0.0'
$platform=Join-Path $Sdk 'platforms/android-36/android.jar'
$source=Join-Path $PSScriptRoot 'app/src/main'
$build=Join-Path $PSScriptRoot 'build/manual'
$key=Join-Path $PSScriptRoot '.dev-signing/debug.keystore'
New-Item -ItemType Directory -Force -Path "$build/classes","$build/dex","$PSScriptRoot/.dev-signing" | Out-Null
function Check { if($LASTEXITCODE -ne 0){throw "Build failed: $LASTEXITCODE"} }
& "$bt/aapt2.exe" compile --dir "$source/res" -o "$build/res.zip"
Check
# Gradle injects these values normally; the offline build writes its own merged manifest.
$manifest=Get-Content -LiteralPath "$source/AndroidManifest.xml" -Raw
$manifest=$manifest.Replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">','<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="it.calcolosemplice.app" android:versionCode="5" android:versionName="0.4.0"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="36"/>')
$manifest=$manifest.Replace('android:name=".MainActivity"','android:name="it.calcolosemplice.app.MainActivity"')
$manifest=$manifest.Replace('<application ','<application android:debuggable="true" ')
[IO.File]::WriteAllText("$build/AndroidManifest.xml",$manifest)
& "$bt/aapt2.exe" link -o "$build/resources.apk" --manifest "$build/AndroidManifest.xml" -I $platform -A "$source/assets" "$build/res.zip"
Check
$javaFiles=Get-ChildItem -LiteralPath "$source/java" -Filter '*.java' -Recurse | ForEach-Object FullName
& "$Jdk/bin/javac.exe" -encoding UTF-8 --release 8 -classpath $platform -d "$build/classes" $javaFiles
Check
$classes=Get-ChildItem -LiteralPath "$build/classes" -Filter '*.class' -Recurse | ForEach-Object FullName
& "$bt/d8.bat" --lib $platform --min-api 26 --output "$build/dex" $classes
Check
Copy-Item -LiteralPath "$build/resources.apk" -Destination "$build/unsigned.apk" -Force
Push-Location "$build/dex"
try { & "$bt/aapt.exe" add "$build/unsigned.apk" classes.dex; Check } finally {Pop-Location}
& "$bt/zipalign.exe" -f 4 "$build/unsigned.apk" "$build/aligned.apk"
Check
if(!(Test-Path -LiteralPath $key)){
 & "$Jdk/bin/keytool.exe" -genkeypair -keystore $key -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Calcolo Semplice,C=IT'
 Check
}
& "$Jdk/bin/java.exe" -jar "$bt/lib/apksigner.jar" sign --ks $key --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$build/Calcolo-semplice-0.4.0-debug.apk" "$build/aligned.apk"
Check
& "$Jdk/bin/java.exe" -jar "$bt/lib/apksigner.jar" verify --verbose "$build/Calcolo-semplice-0.4.0-debug.apk"
Check
Write-Output "APK: $build/Calcolo-semplice-0.4.0-debug.apk"
