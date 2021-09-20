import fetch from 'node-fetch';
import * as AWS from 'aws-sdk';
import { origStarshipResourceScheme, wookieeStarshipResourceScheme } from "../../interfaces/InterfacesAll";
import { v1 } from 'node-uuid';

async function putStarshipRecordOrigWooTable(
    origRawData: string,
    wookieeRawData: string,
    origTableName: string,
    wookieeTableName: string,
): Promise<void> {
    // creating a db client
    const ddbAgent = new AWS.DynamoDB.DocumentClient();
    //generated record id for a record in original table.
    // will be used as search key in wookiee table
    const recordId = v1();
    // parsing input and creating a db record for original table
    let origRecord: origStarshipResourceScheme = JSON.parse(origRawData);
    // film doesn't have name it's a title, but we need all tables to 
    // have the same structure to make a standard request functions
    origRecord.id = recordId;
    var origParams = {
        TableName: origTableName,
        Item: origRecord,
    }
    // parsing input for wookiee table record with according interface
    let wookieeRecord: wookieeStarshipResourceScheme = JSON.parse(wookieeRawData);
    wookieeRecord.id = recordId;
    let wookieeParams = {
        TableName: wookieeTableName,
        Item: wookieeRecord,
    }

    var originalResponce = await ddbAgent.put(origParams).promise();
    var wookieeResponce = await ddbAgent.put(wookieeParams).promise();
}

export const handler = async () => {
    // first URL from environment variables;
    // let url: string = "https://swapi.dev/api/films/";
    let url: string = process.env.starWarsResourceUrl;
    // gathering all films into a single array
    let allStarshipList: any[] = [];
    // the paging loop
    do {
        let allStarshipResponce = await fetch(url)
        let allStarshipBody = await allStarshipResponce.json();
        allStarshipList = allStarshipList.concat(allStarshipBody["results"]);
        url = allStarshipBody["next"]
    }
    while (url !== null);
    for (let i = 0; i < allStarshipList.length; i++) {
        let url = `${allStarshipList[i]['url']}?format=wookiee`
        let wookieeStarshipResponce = await fetch(url);
        let wookieeStarshipBodyOrig = await wookieeStarshipResponce.text();
        let regex = /\\rc\\w/gm;
        let wookieeStarshipBodyFixed = wookieeStarshipBodyOrig.replace(regex, "\\r\\n");
        putStarshipRecordOrigWooTable(JSON.stringify(allStarshipList[i]), wookieeStarshipBodyFixed, process.env.ddbOrigTableName, process.env.ddbWookieeTableName);
    }
}

// handler();