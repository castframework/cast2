import { ZodError, z } from 'zod';
import { IsETHAddress } from './validations';

const EnvConfigVariableName = 'MINT_DATA_CONFIG';

const MintDataConfigSchema = z.object({
  tokenOperators: z.object({
    registrarAgent: z.string().refine(...IsETHAddress),
    settlementAgent: z.string().refine(...IsETHAddress),
  }),
  tokenMetadata: z.object({
    uri: z.string(),
    formerSmartContractAddress: z.string().refine(...IsETHAddress),
    webUri: z.string(),
  }),
  satelliteDetails: z.object({
    implementationAddress: z.string().refine(...IsETHAddress),
    name: z.string(),
    symbol: z.string(),
  }),
  outputFolder: z.string(),
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
