// Loads + validates env via the side effects of importing the config.
// Tests that need data isolation truncate tables in beforeEach (see tests/helpers.ts).
import { config } from '../src/config/env.js';

void config;
