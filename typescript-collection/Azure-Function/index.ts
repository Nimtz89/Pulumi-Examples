import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as web from "@pulumi/azure-native/web";

import { getStorageConnectionString, signedBlobReadUrl } from "./helper-functions"
import { storagesync } from "@pulumi/azure-native/types/enums";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("pulumi-examples", {
    resourceGroupName: "pulumi-examples",
});

// Create a storage account
const storageAccount = new storage.StorageAccount("pulumiexamplesstorage", {
    resourceGroupName: resourceGroup.name,
    accountName: "pulumiexamplesstorage",
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

//Create an app service plan
const plan = new web.AppServicePlan("pulumi-plan", {
    resourceGroupName: resourceGroup.name,
    sku:{
        name: "Y1",
        tier: "Dynamic",
        },
})

//Create blob container
const container = new storage.BlobContainer("pulumiblob", {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
})

//Upload the function's code as zip to the storage account
const tsCodeBlob = new storage.Blob("zip", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: container.name,
    source: new pulumi.asset.FileArchive("./Pulumi-function")
})

const connectionStringStorage = getStorageConnectionString(resourceGroup.name, storageAccount.name)
const blobUrl = signedBlobReadUrl(tsCodeBlob, container, storageAccount, resourceGroup)

const functionApp = new web.WebApp("pulumi-function", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: plan.id,
    kind: "functionapp",
    siteConfig: {
        appSettings: [
            { name: "AzureWebJobsStorage", value: connectionStringStorage },
            { name: "FUNCTIONS_EXTENSION_VERSION", value: "~3" },
            { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
            { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~16" },
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: blobUrl },
        ],
        http20Enabled: true,
        nodeVersion: "~16"
    }
})

// Export the primary key of the Storage Account
export const functionEndpoint = pulumi.interpolate`https://${functionApp.defaultHostName}/api/Pulumi-function?name=Pulumi`;