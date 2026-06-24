import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * "Clinical Pine" — the HSM console's PrimeNG preset.
 *
 * A deep pine-teal primary (distinct from the generic medical-blue / default
 * AI-teal) over warm-cool neutral surfaces. Defined once here so every PrimeNG
 * component — buttons, tables, inputs, dialogs, tabs, selects — inherits the
 * identity. Light scheme only: an all-day operations console reads best calm
 * and bright, so dark mode is disabled in `app.config.ts`.
 *
 * Component-level polish (typography, layout chrome, the sidebar) lives in
 * `styles.css` and the shell; this file owns colour.
 */
export const HsmPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '3px',
      sm: '5px',
      md: '7px',
      lg: '9px',
      xl: '14px',
    },
  },
  semantic: {
    // Pine ramp — primary actions land on a confident, vivid pine.
    primary: {
      50: '#edfbf6',
      100: '#d2f4e7',
      200: '#a6e9d1',
      300: '#6fd8b6',
      400: '#34bf97',
      500: '#12a37b',
      600: '#0c8466',
      700: '#0c6a53',
      800: '#0b5a4e',
      900: '#0a4338',
      950: '#042a22',
    },
    // Warm-cool neutral with a faint green undertone — clinical, not cold.
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f6f8f7',
          100: '#eef1f0',
          200: '#e2e7e5',
          300: '#cdd5d2',
          400: '#9fabA7',
          500: '#74827d',
          600: '#586863',
          700: '#45524e',
          800: '#2c3633',
          900: '#1a211f',
          950: '#0e1311',
        },
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
        formField: {
          background: '#ffffff',
          borderColor: '{surface.300}',
          hoverBorderColor: '{primary.500}',
          focusBorderColor: '{primary.600}',
        },
      },
    },
  },
});
