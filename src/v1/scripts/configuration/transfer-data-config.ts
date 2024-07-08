import { ZodError, z } from 'zod';
import { TransferKind } from '../../test/utils/types';

const IsTransferKind = [
  (val: string) => ([TransferKind.DIRECT, TransferKind.LOCK] as string[]).includes(val),
  { message: 'Must be a valid Transfer Kind' }
] as const;

const EnvConfigVariableName = 'TRANSFER_DATA_CONFIG';

const TransferDataConfigSchema = z.object({
  TransferKind: z.string().refine(...IsTransferKind).transform(val => val as TransferKind),
  TransactionId: z.string().uuid().optional(),
  OutputFolder: z.string()
});

export type TransferDataConfig = z.infer<typeof TransferDataConfigSchema>;

export function GetTransferDataConfig(): TransferDataConfig {
  let configFromEnv = process.env[EnvConfigVariableName];

  try {
    return TransferDataConfigSchema.parse(JSON.parse(configFromEnv || ''));
  } catch (e) {
    if (e instanceof ZodError) {
      throw `Invalid configuration : ${e.toString()}`;
    }

    throw e;
  }
}