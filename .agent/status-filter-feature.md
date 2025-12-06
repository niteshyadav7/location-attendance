# Dynamic Status Filter Feature

## Summary
Added clickable status cards to the Admin Dashboard that allow filtering users by their current status (Working, On Break, Done/Checked Out, Offline).

## Features Implemented

### 1. Clickable Status Cards
- All four status cards are now touchable/clickable
- Visual feedback when a card is selected:
  - White border around the active card
  - Checkmark icon in the top-right corner
  - Slightly larger scale (1.02x)
  - Increased elevation for depth

### 2. Dynamic User Filtering
- When a status card is clicked, the user list filters to show only users with that status
- Clicking the same card again clears the filter (toggle behavior)
- Filter works in combination with the search bar

### 3. Filter Indicator Banner
- Purple banner appears when a filter is active
- Shows which status is currently being filtered
- "Clear Filter" button to quickly remove the filter
- Funnel icon for visual clarity

### 4. Status Mapping
- **Working** → Shows users with `WORKING` status
- **On Break** → Shows users with `ON_BREAK` status  
- **Done** → Shows users with `CHECKED_OUT` status
- **Offline** → Shows users with `OFFLINE` status or no status

## User Experience

### Filtering Flow
1. User taps on any status card (e.g., "Working")
2. Card highlights with white border and checkmark
3. User list instantly filters to show only working users
4. Filter indicator banner appears below search bar
5. User can:
   - Tap the same card again to clear filter
   - Tap a different card to switch filters
   - Click "Clear Filter" button in the banner
   - Still use search bar to further filter results

### Combined Filtering
- Status filter + Search work together
- Example: Filter by "Working" status, then search for "John"
  - Shows only working users named John

## Visual Design
- **Active Card**: White border, checkmark icon, elevated
- **Filter Banner**: Purple background (#ede9fe) with purple text
- **Clear Button**: White background with purple text
- Smooth transitions and visual feedback
- Consistent with existing design language

## Technical Details
- State management with `selectedStatus` hook
- Filter logic in `useEffect` with dependencies on `searchQuery`, `users`, and `selectedStatus`
- Toggle behavior for better UX
- Responsive and performant filtering
