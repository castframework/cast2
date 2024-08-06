import path from 'path';
import process from 'process';
import {
  GetNewSatelliteImplementationConfig,
  NewSatelliteImplementationConfig,
} from '../configuration/new-satellite-implementation-config';

const config = GetNewSatelliteImplementationConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.OutputFolder,
  'implementation-deploy-satellite-data-field.json',
));

const usedConfig: NewSatelliteImplementationConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Satellite Implemention deploy transaction data field

### Used Operators 

    - ImplementationArtifactName : ${usedConfig.Contracts.ImplementationArtifactName}

### Generated Data Field

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
