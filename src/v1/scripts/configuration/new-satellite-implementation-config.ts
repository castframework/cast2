import { ZodError, z } from 'zod';

const EnvConfigVariableName = 'NEW_SATELLITE_IMPLEMENTATION_JSON_CONFIG';

const NewSecurityTokenImplementationConfigSchema = z.object({
  Contracts: z.object({
    ImplementationArtifactName: z.string(),
  }),
  OutputFolder: z.string(),
});

export type NewSecurityTokenImplementationConfig = z.infer<
  typeof NewSecurityTokenImplementationConfigSchema
>;

export function GetNewSatelliteImplementationConfig(): NewSecurityTokenImplementationConfig {
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
