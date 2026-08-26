export class ContainerConversionError extends Error {
  readonly code = 'CONTAINER_CONFIRM'

  constructor(message = 'This module will become a grouping folder; workflow moves to children.') {
    super(message)
    this.name = 'ContainerConversionError'
  }
}

export function isContainerConversionError(error: unknown): error is ContainerConversionError {
  return error instanceof ContainerConversionError || (error instanceof Error && error.name === 'ContainerConversionError')
}
