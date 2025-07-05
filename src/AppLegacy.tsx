// Legacy App component - kept for reference
// This file contains the original hook-based architecture
// before migration to service layer architecture

// The original App.tsx has been replaced with the new service-based architecture
// using GameContainer and GameUI components.

// Key differences in the new architecture:
// 1. Business logic moved to GameContainer
// 2. UI logic isolated in GameUI
// 3. State management centralized in useGameService
// 4. Helper functions consolidated in gameHelpers.ts
// 5. Error handling improved with ErrorBoundary

// This file is kept for reference and comparison purposes.
// The new architecture provides:
// - Better separation of concerns
// - Improved testability
// - Reduced code duplication
// - Enhanced maintainability
// - Better error handling

export default function AppLegacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Legacy App Component
        </h1>
        <p className="text-gray-600">
          This is the legacy version of the App component.
          The new architecture uses GameContainer and GameUI components.
        </p>
      </div>
    </div>
  );
}