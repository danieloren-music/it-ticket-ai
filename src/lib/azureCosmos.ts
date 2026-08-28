import { CosmosClient, Container } from '@azure/cosmos';

let containerInstance: Container | null = null;

export function getTicketsContainer(): Container {
  if (!containerInstance) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const key = process.env.COSMOS_KEY || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'SmartDeskDB';
    const containerId = process.env.COSMOS_CONTAINER_ID || 'tickets';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB credentials (COSMOS_ENDPOINT, COSMOS_KEY) are missing in environment variables.');
    }

    const client = new CosmosClient({ endpoint, key });
    containerInstance = client.database(databaseId).container(containerId);
  }

  return containerInstance;
}