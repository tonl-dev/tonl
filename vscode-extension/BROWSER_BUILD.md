# Browser Build Notes

The browser build currently requires additional work due to Node.js-specific features:
- FileEditor uses 'fs' module
- REPL uses 'readline' module  
- Stream query uses 'fs' and 'readline'

For now, TONL is optimized for Node.js environments where all features work perfectly.

Browser support coming in future release (or use encode/decode only).
