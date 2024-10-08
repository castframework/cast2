import { ZodError, z } from 'zod';
import { IsETHAddress } from './validations';

const EnvConfigVariableName = 'NEW_SECURITY_TOKEN_PROXY_JSON_CONFIG';

const NewSecurityTokenProxyConfigSchema = z.object({
  Contracts: z.object({
    ImplementationArtifactName: z.string(),
    BaseUri: z.string(),
    DefaultUri: z.string(),
    ImplementationAddress: z.string().refine(...IsETHAddress),
    Name: z.string(),
    Symbol: z.string(),
  }),
  OutputFolder: z.string(),
});

export type NewSecurityTokenProxyConfig = z.infer<
  typeof NewSecurityTokenProxyConfigSchema
>;

export function GetNewSecurityTokenProxyConfig(): NewSecurityTokenProxyConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return NewSecurityTokenProxyConfigSchema.parse(
      JSON.parse(configFromEnv || ''),
    );
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}
