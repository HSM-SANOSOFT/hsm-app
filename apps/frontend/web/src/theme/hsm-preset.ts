import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * Company brand — the HSM console's PrimeNG preset.
 *
 * A deep cobalt-blue primary (brand `#0E4D98`) over neutral gray surfaces that
 * step down to brand navy ink. Defined once here so every PrimeNG component —
 * buttons, tables, inputs, dialogs, tabs, selects — inherits the identity.
 * Light scheme only: an all-day operations console reads best calm and bright,
 * so dark mode is disabled in `app.config.ts`.
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
    // Brand blue ramp — primary actions land on the confident cobalt brand blue.
    primary: {
      50: '#eef4fb',
      100: '#d6e5f6',
      200: '#aac9ec',
      300: '#74a6e0',
      400: '#3f86d4',
      500: '#1c6bc4',
      600: '#175cae',
      700: '#0e4d98',
      800: '#0c3f7c',
      900: '#11304f',
      950: '#0a2138',
    },
    // Neutral gray surfaces (brand neutral) stepping down to brand navy ink.
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f6f8fa',
          100: '#eef1f4',
          200: '#e3e6e9',
          300: '#cdcfd1',
          400: '#a3acb5',
          500: '#6a7785',
          600: '#4f5e6e',
          700: '#3a5066',
          800: '#243a52',
          900: '#11304f',
          950: '#0a2138',
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
