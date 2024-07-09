import { ZodError, z } from 'zod';
import { IsETHAddress } from './validations';

const EnvConfigVariableName = 'DEPLOY_UPGRADABLE_SECURITY_TOKEN_CONFIG';

const DeployUpgradableSecrityTokenSchema = z.object({
  NewOperatorsAddress: z.object({
    Registrar: z.string().refine(...IsETHAddress),
    Technical: z.string().refine(...IsETHAddress),
  }),
  Contracts: z.object({
    ImplementationArtifactName: z.string(),
    BaseUri: z.string(),
    DefaultUri: z.string(),
    Name: z.string(),
    Symbol: z.string(),
  }),
  OutputFolder: z.string(),
});

export type DeployUpgradableSecrityTokenConfig = z.infer<
  typeof DeployUpgradableSecrityTokenSchema
>;

export function GetDeployUpgradableSecrityTokenConfig(): DeployUpgradableSecrityTokenConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return DeployUpgradableSecrityTokenSchema.parse(
      JSON.parse(configFromEnv || ''),
    );
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}
