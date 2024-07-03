import { ZodError, z } from 'zod';
import { IsETHAddress } from './validations';

const EnvConfigVariableName = 'NEW_SECURITY_TOKEN_IMPLEMENTATION_JSON_CONFIG';

const NewSecurityTokenImplementationConfigSchema = z.object({
  NewOperatorsAddress: z.object({
    Registrar: z.string().refine(...IsETHAddress),
    Technical: z.string().refine(...IsETHAddress),
  }),
  Contracts: z.object({
    ImplementationArtifactName: z.string(),
  }),
  OutputFolder: z.string(),
});

export type NewSecurityTokenImplementationConfig = z.infer<
  typeof NewSecurityTokenImplementationConfigSchema
>;

export function GetNewSecurityTokenImplementationConfig(): NewSecurityTokenImplementationConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return NewSecurityTokenImplementationConfigSchema.parse(
      JSON.parse(configFromEnv || ''),
    );
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}
