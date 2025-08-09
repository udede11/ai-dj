# AI DJ Party iOS App

## Setup Instructions

### 1. Create Xcode Project
1. Open Xcode
2. Create a new iOS App project
3. Product Name: AI DJ Party
4. Interface: SwiftUI
5. Language: Swift
6. Minimum Deployments: iOS 17.0

### 2. Add Supabase Package
1. In Xcode, go to File → Add Package Dependencies
2. Enter URL: `https://github.com/supabase/supabase-swift.git`
3. Version: Up to Next Major Version (from 2.0.0)
4. Add to Target: AI DJ Party

### 3. Configure Info.plist
Add camera permission key:
- Key: `NSCameraUsageDescription`
- Value: `AI DJ Party needs camera access to analyze the party vibe`

### 4. Add Project Files
Replace the default Xcode files with the files from this repository:
- Copy all files from `app/` folder into your Xcode project
- The `supabase/` folder contains backend configuration

### 5. Configure Supabase
1. Update `supabase/Supabase.swift` with your Supabase project credentials:
   - Replace `YOUR_PROJECT_ID` with your actual project ID
   - Replace `YOUR_ANON_KEY` with your actual anon key

### 6. Build and Run
1. Select your target device or simulator (requires iOS 17+)
2. Build and run the project
3. Grant camera permissions when prompted

## Project Structure

```
ai-dj-party/
├── app/
│   ├── App.swift                 # Main app entry point
│   ├── ContentView.swift         # Main UI with camera preview
│   ├── CameraManager.swift       # Camera session management
│   └── CameraPreviewView.swift   # UIViewRepresentable for camera
└── supabase/
    ├── Supabase.swift            # Supabase client initialization
    └── README.md                 # Supabase setup instructions
```

## Features

- Full-screen live camera preview
- Minimalist dark theme UI
- "AI DJ Mode" header
- Start/Stop Party button with rainbow gradient
- Mood indicator with analyzing animation
- Frame capture every 5 seconds (logs to console)
- Camera permission handling
- Supabase integration ready (commented out)

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Swift 5.9+
- Camera access permission