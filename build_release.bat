@echo off
set JAVA_HOME=E:\android_studio_panda\jbr
set PATH=%JAVA_HOME%\bin;%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%

echo.
echo [1/2] Syncing web assets...
call npx cap sync android
if %errorlevel% neq 0 ( echo SYNC FAILED & pause & exit /b 1 )

echo.
echo [2/2] Building signed release AAB...
cd android
call gradlew.bat bundleRelease
if %errorlevel% neq 0 ( echo BUILD FAILED & cd .. & pause & exit /b 1 )
cd ..

echo.
echo DONE! AAB is at:
echo android\app\build\outputs\bundle\release\app-release.aab
echo.
echo Upload this file to Google Play Console.
pause
