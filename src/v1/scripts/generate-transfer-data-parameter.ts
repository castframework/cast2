import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { TransferKind } from '../test/utils/types';
import { GetTransferDataConfig } from './configuration/transfer-data-config';

async function main() {
  console.log('Starting...');

  const config = GetTransferDataConfig();

  console.log('Used config', config);

  const outputFile = path.join(
    config.OutputFolder,
    'transfer-data-field.json',
  );

  const newTransferData = generateDataForTransfer(
        config.TransferKind,
        config.TransactionId,
    );

  console.log(`Generated data field :\n${newTransferData}`);

  console.log(`Writing to file : ${outputFile}`);

  const fileContentAsPOJO = {
    description:
      'Data field to be used in a transaction for a safeTransferFrom',
    usedConfig: {
      ...config,
    },
    data: newTransferData,
  };

  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(fileContentAsPOJO, null, '   '),
  );
}

function generateDataForTransfer(transferKind: TransferKind, transactionId?: string){
    var AbiCoder = new ethers.AbiCoder();

    if(transferKind === TransferKind.LOCK){
      
      return AbiCoder.encode(
          [
            'tuple(string kind, string transactionId) transferData',
          ],
          [{ kind: transferKind, transactionId }],
        );
      }

    if(transferKind === TransferKind.DIRECT){
      return AbiCoder.encode(
        [
          'tuple(string kind) transferData',
        ],
        [{ kind: transferKind }],
      );
    }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});