import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Polyfill banner for __dirname and __filename in ES modules
const dirnamePolyfill = `
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __pathDirname } from 'path';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
`;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({
      // Bundle these packages into the main process (they won't be in node_modules in packaged app)
      // The 'exclude' list means "exclude from externalization" = "bundle these"
      exclude: [
        // Core utilities
        'dotenv',  // Required at startup before any other imports
        'uuid',
        'semver',  // Version comparison utilities
        'zod',  // Schema validation
        'minimatch',  // Glob pattern matching

        // Electron ecosystem
        'electron-updater',
        'electron-log',  // Logging for main process
        '@electron-toolkit/utils',
        '@sentry/electron',  // Error tracking (includes /main)

        // File system utilities
        'chokidar',
        'proper-lockfile',  // File locking for profile manager
        'kuzu',

        // API clients
        '@anthropic-ai/sdk'  // Anthropic SDK for API key validation
      ]
    })],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        // Only node-pty needs to be external (native module rebuilt by electron-builder)
        external: ['@lydell/node-pty'],
        output: {
          // Inject __dirname/__filename polyfill at the start of the bundle
          banner: dirnamePolyfill
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@features': resolve(__dirname, 'src/renderer/features'),
        '@components': resolve(__dirname, 'src/renderer/shared/components'),
        '@hooks': resolve(__dirname, 'src/renderer/shared/hooks'),
        '@lib': resolve(__dirname, 'src/renderer/shared/lib')
      }
    },
    server: {
      watch: {
        // Ignore directories to prevent HMR conflicts during merge operations
        // Using absolute paths and broader patterns
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.worktrees/**',
          '**/.auto-claude/**',
          '**/out/**',
          // Ignore the parent autonomous-coding directory's worktrees
          resolve(__dirname, '../.worktrees/**'),
          resolve(__dirname, '../.auto-claude/**'),
        ]
      }
    }
  }
});
