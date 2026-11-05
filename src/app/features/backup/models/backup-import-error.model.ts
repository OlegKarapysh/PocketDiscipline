export class BackupImportError extends Error {
  constructor(
    readonly code:
      | 'file-read'
      | 'too-large'
      | 'invalid-json'
      | 'invalid-header'
      | 'update-required'
      | 'encryption-unsupported'
      | 'unsupported-version'
      | 'invalid-row'
      | 'duplicate-key'
      | 'invalid-reference'
      | 'device-changed'
      | 'storage-failed',
    message: string,
    readonly path?: string,
  ) {
    super(path ? `${message} (${path})` : message);
    this.name = 'BackupImportError';
  }
}
