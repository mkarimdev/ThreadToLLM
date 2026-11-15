# Decoupled Adapter and UI Contracts

Platform adapters expose separate interfaces for data extraction and UI injection (`PlatformAdapter` for parsing DOM into a `ThreadDocument`, and `PlatformUI` for mounting native buttons into the host DOM). Coupling extraction with button injection makes headless unit testing difficult, while separating them allows DOM parsing logic to run against static fixtures without mocking action bars or event listeners.
