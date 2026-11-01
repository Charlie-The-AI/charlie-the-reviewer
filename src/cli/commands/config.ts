import pc from "picocolors";
import {
  findConfigFile,
  loadConfigFile,
  validateConfigurationObject,
} from "../../config/loader.js";
import { logger } from "../../utils/logger.js";

export async function runConfigValidateCommand(options: { config?: string }): Promise<number> {
  const file = options.config || findConfigFile(process.cwd());

  if (!file) {
    logger.error("No AI Code Reviewer configuration file found in this directory.");
    console.log(pc.gray("Run `charlie-the-reviewer init` to generate a configuration file."));
    return 1;
  }

  logger.info(`Validating configuration file: ${pc.bold(file)}`);

  try {
    const raw = loadConfigFile(file);
    const result = validateConfigurationObject(raw);

    if (result.success) {
      logger.success("Configuration is valid and conforms to schema.");
      console.log(pc.gray(`Provider: ${result.data?.ai.provider} (${result.data?.ai.model})`));
      console.log(pc.gray(`Strictness: ${result.data?.review.strictness}`));
      console.log(pc.gray(`Fail On: ${result.data?.review.fail_on.join(", ")}`));
      return 0;
    } else {
      logger.error("Configuration validation failed:");
      for (const err of result.errors || []) {
        console.error(pc.red(`  ${err}`));
      }
      return 1;
    }
  } catch (err) {
    logger.error(
      `Failed to read configuration: ${err instanceof Error ? err.message : String(err)}`
    );
    return 1;
  }
}
