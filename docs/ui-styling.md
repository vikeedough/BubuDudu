# UI Styling Guide

Use this guide before creating or changing UI components. It captures the current BubuDudu visual language so new work feels native to the app.

## Overall Feel

- The app should feel soft, personal, and compact rather than corporate or marketing-like.
- Build real app screens first. Avoid landing-page structures, oversized hero copy, decorative cards inside cards, or instructional text that explains the UI.
- Prefer practical layouts with clear hierarchy, short labels, and controls users can scan quickly.

## Core Tokens

- Use `Colors` from `constants/colors.ts` before adding new hard-coded colours.
- The main app background is `Colors.backgroundPink`.
- Primary text is usually `Colors.darkGreenText`.
- Secondary warm text often uses `Colors.brownText`.
- Primary actions use the yellow family: `Colors.yellow`, `#FFCC7D`, or `#FFBA50` depending on the existing component.
- Use `Colors.white` for input/card surfaces and `#EBEAEC` for quiet borders.
- Use `listColorsArray` for fixed app palettes. For user custom colours, store normalized `#RRGGBB` values and make dependent UI choose readable text contrast.

## Typography

- Use `CustomText` for all display text.
- The app uses Raleway. Available weights are `regular`, `medium`, `semibold`, `bold`, and `extrabold`.
- Screen titles are typically 22-24px, `extrabold`, and `Colors.darkGreenText`.
- Dates and compact helper labels are typically 12-14px.
- Do not scale font sizes with viewport width. Keep letter spacing at 0.

## Layout

- Screen roots should usually be `SafeAreaView` with `flex: 1` and `backgroundColor: Colors.backgroundPink`.
- Common horizontal padding is 20-25px. Avoid percentage padding for main app screens unless an existing screen requires it.
- Keep forms vertically spaced with 14-20px gaps and enough bottom padding for the tab bar or safe area.
- Use `ScrollView` for settings/form screens that may grow on small devices.
- Keep compact control dimensions stable so text, selection states, and loading labels do not resize the surrounding layout.

## Cards And Surfaces

- Use cards for individual grouped controls or repeated items, not as wrappers around whole page sections.
- Existing app card radii are usually 10-15px. Prefer 10px for dense form controls and 15px for softer feature cards.
- Use `shadowStyle` from `constants/shadows.ts` for elevated cards/buttons.
- Do not nest cards inside cards. If a grouped setting needs inner controls, use borders, dividers, or unframed rows inside the outer card.

## Buttons And Controls

- Primary buttons are rounded yellow surfaces with `Colors.brownText` labels and subtle shadow.
- Secondary/destructive actions should be visually distinct but restrained: gray for cancel/neutral, red for destructive.
- Disabled controls should reduce opacity and keep their dimensions.
- Use icon assets where they already exist. Do not introduce hand-drawn icons for common actions when a reusable asset exists.

## Forms

- Labels should be compact, usually `semibold` or `bold`, and `Colors.darkGreenText`.
- Inputs should use white surfaces, 10-15px radius, `#EBEAEC` borders, Raleway font, and dark text.
- Keep date pickers and custom selectors visually aligned with text input fields.
- Prefer explicit Save for profile/settings changes so users can preview changes first.

## Avatars And Colours

- User avatar identity is expressed by a circular image with a thick coloured border.
- Avatar colour controls should show a live circular preview.
- Any user-selected colour can affect Expenses controls, so text placed on top of that colour must use contrast-aware foreground colour.
- Colour strings should be normalized to uppercase `#RRGGBB` before saving.

## Feature-Specific Notes

- Settings should use the same soft app background, dark-green headings, white setting cards, yellow save/copy actions, and compact rounded controls found in onboarding, home, notes, and expenses.
- Expense controls can use avatar colours as accents, but selected state text must remain readable for arbitrary custom colours.
- Onboarding and gallery can continue to use the fixed `listColorsArray` palette unless a feature specifically requires custom colours.
