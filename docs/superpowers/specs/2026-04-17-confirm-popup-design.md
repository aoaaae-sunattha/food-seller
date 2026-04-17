# Design Spec: Modern Confirmation Popup

**Date:** 2026-04-17
**Topic:** Modernized Delete Confirmation Modal for Daily Sales History
**Status:** Implemented

## Overview
Replaced the default browser `prompt()` and `confirm()` dialogs with a custom, tablet-optimized React component to provide a safer and more professional user experience when deleting sensitive sales records.

## Key Features

### 1. Modern Visual Design
*   **Backdrop**: Utilizes a full-screen dark overlay with a high-intensity blur (`backdrop-blur-md`, `bg-slate-900/60`). This creates depth and forces the user's attention to the modal.
*   **Clean Layout**: Centered card design with consistent padding (`p-8`) and rounded corners (`rounded-3xl`).
*   **Iconography**: A prominent red `Trash2` icon set against a light-red circular background provides immediate visual context for "Danger" actions.

### 2. Safety & Verification
*   **Explicit Context**: The modal explicitly displays the name of the menu item targeted for deletion (e.g., `"Pad Thai"`) to prevent accidental removal of the wrong row.
*   **Irreversibility Warning**: Includes clear copy stating "This action cannot be undone."
*   **Forced Interaction**: Clicking outside the modal (on the backdrop) will **not** close the modal. This ensures the user makes a deliberate choice.
*   **Explicit Dismissal**: The modal can only be closed by:
    *   Clicking the **'X'** button in the top right corner.
    *   Clicking the **'Cancel'** button.
    *   Pressing the **ESC** key.

### 3. Deletion Audit (Reason Tracking)
*   **Required Input**: Includes a styled text input for the user to provide a mandatory reason for deletion (e.g., "Wrong quantity", "Duplicate entry").
*   **Data Integrity**: This reason is sent to the backend and recorded in the `System Deletion Audit` table to maintain a transparent paper trail.

### 4. Interactions & Animations
*   **Entry Animation**: The modal uses `animate-in zoom-in-95 slide-in-from-bottom-4` for a smooth, high-quality "pop" effect.
*   **Button Feedback**:
    *   **Cancel**: Subtle gray border with background shift on hover.
    *   **Delete**: High-contrast red background with a shadow glow (`shadow-error-red/30`) and active-state scaling (`active:scale-95`).
*   **Keyboard Support**: Automatically focuses the reason input field on open and supports `ESC` to close.

### 5. Technical Integrity
*   **Loading State**: The "Delete" button features a spinning loader and disables itself during the asynchronous API call to prevent race conditions or duplicate deletions.
*   **State Management**: Orchestrated via local React state (`itemToDelete`, `deleteReason`) in the `DailySalesPage` component.

## Implementation Details
*   **Files:** 
    *   `app/daily-sales/page.tsx` (With reason tracking)
    *   `app/manage-menus/page.tsx` (Simple confirmation)
*   **Tech Stack:** Tailwind CSS, Lucide Icons, Next.js (Client Component).
