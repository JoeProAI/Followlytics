@echo off
echo 🧹 Firebase Database Cleanup Script
echo ====================================
echo.
echo This script will DELETE all follower data from Firebase.
echo.
echo What gets deleted:
echo - All followers from users/{userId}/followers
echo - All exports from users/{userId}/follower_exports
echo - All tracked accounts
echo - Legacy follower_database
echo - Follower cache
echo.
echo What's preserved:
echo - User accounts
echo - Subscriptions
echo - Payment history
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "

if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Cleanup cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting cleanup...
echo.
echo ⚠️  Make sure your Firebase credentials are in .env.local
echo.

npx tsx scripts/clean-database.ts

echo.
echo ✅ Cleanup script finished!
echo.
pause
