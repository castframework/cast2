import { ZodError, z } from 'zod';

const EnvConfigVariableName = 'NEW_SATELLITE_IMPLEMENTATION_JSON_CONFIG';

const NewSatelliteImplementationConfigSchema = z.object({
  Contracts: z.object({
    ImplementationArtifactName: z.string(),
  }),
  OutputFolder: z.string(),
});

export type NewSatelliteImplementationConfig = z.infer<
  typeof NewSatelliteImplementationConfigSchema
>;

export function GetNewSatelliteImplementationConfig(): NewSatelliteImplementationConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return NewSatelliteImplementationConfigSchema.parse(
      JSON.parse(configFromEnv || ''),
    );
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}
