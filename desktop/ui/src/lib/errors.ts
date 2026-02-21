export type AppErrorCode =
  | "IPC_INVALID_PAYLOAD"
  | "IPC_INVALID_RESPONSE"
  | "IPC_COMMAND_FAILED"
  | "IPC_TIMEOUT";

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
