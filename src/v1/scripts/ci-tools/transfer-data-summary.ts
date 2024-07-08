import path from 'path';
import process from 'process';
import { GetTransferDataConfig, TransferDataConfig } from '../configuration/transfer-data-config';

const config = GetTransferDataConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.OutputFolder,
  'transfer-data-field.json',
));

const usedConfig: TransferDataConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Transfer data parameter

### Used configuration 

    - Transfer Kind : ${usedConfig.TransferKind}
    - Transaction Id : ${usedConfig.TransactionId}

### Generated Data Parameter

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);