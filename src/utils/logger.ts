import pc from "picocolors";
import { redactSecrets } from "./redaction.js";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LoggerOptions {
  quiet?: boolean;
  debug?: boolean;
  colors?: boolean;
}

export class Logger {
  private isQuiet: boolean;
  private isDebug: boolean;

  constructor(options: LoggerOptions = {}) {
    this.isQuiet = Boolean(options.quiet);
    this.isDebug = Boolean(options.debug);
  }

  setQuiet(quiet: boolean): void {
    this.isQuiet = quiet;
  }

  setDebug(debug: boolean): void {
    this.isDebug = debug;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isQuiet) return;
    console.log(pc.cyan("ℹ"), message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (this.isQuiet) return;
    console.log(pc.green("✔"), pc.bold(message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isQuiet) return;
    console.warn(pc.yellow("⚠"), pc.yellow(message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(pc.red("✖"), pc.red(message), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.isDebug) return;
    const sanitizedMsg = redactSecrets(message);
    const sanitizedArgs = args.map((a) => (typeof a === "string" ? redactSecrets(a) : a));
    console.debug(pc.gray(`[DEBUG] ${sanitizedMsg}`), ...sanitizedArgs);
  }

  header(title: string): void {
    if (this.isQuiet) return;
    console.log();
    console.log(pc.bold(pc.magenta(`=== ${title} ===`)));
    console.log();
  }

  step(step: string): void {
    if (this.isQuiet) return;
    console.log(pc.blue("▶"), step);
  }
}

export const logger = new Logger();
