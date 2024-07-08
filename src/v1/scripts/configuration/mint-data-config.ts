import { ZodError, z } from 'zod';
import { IsETHAddress } from './validations';

const EnvConfigVariableName = 'MINT_DATA_CONFIG';

const MintDataConfigSchema = z.object({
  RegistrarAgentAddress: z.string().refine(...IsETHAddress),
  SettlerAgentAddress: z.string().refine(...IsETHAddress),
  MetadataUri: z.string(),
  OutputFolder: z.string()
});

export type MintDataConfig = z.infer<typeof MintDataConfigSchema>;

export function GetMintDataConfig(): MintDataConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return MintDataConfigSchema.parse(JSON.parse(configFromEnv || ''));
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}