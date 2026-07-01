@echo off
set JAVA_HOME=E:\android_studio_panda\jbr
set PATH=%JAVA_HOME%\bin;%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%

echo.
echo [1/3] Syncing web assets...
call npx cap sync android
if %errorlevel% neq 0 ( echo SYNC FAILED & pause & exit /b 1 )

echo.
echo [2/3] Building APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 ( echo BUILD FAILED & cd .. & pause & exit /b 1 )
cd ..

echo.
echo [3/3] Installing on phone...
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
if %errorlevel% neq 0 ( echo INSTALL FAILED - is your phone connected with USB debugging on? & pause & exit /b 1 )

echo.
echo DONE! App installed on phone.
pause
