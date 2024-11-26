# @merlin4/salesforce

Provides a simple abstraction layer over the Salesforce REST APIs.

- `getAuthorization()` obtains a fresh access token
- `query()` performs SOQL queries against the Salesforce database
- `queryWithTimeout()` provides a simple wrapper to limit the runtime of queries
- `insert()` performs INSERT operations against the Salesforce database
- `update()` performs UPDATE operations against the Salesforce database
- `deleteRecords()` performs DELETE operations against the Salesforce database
