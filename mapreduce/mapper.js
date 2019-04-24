const AWS = require("aws-sdk");
const uuid = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.mapper = async (event, context, callback) => {

    const timestamp = new Date().getTime();
    const data = JSON.parse(event.body);
    let mapData = [];
    let emit = (emittedData) => mapData.push(emittedData);
    eval(data.mapFunction);
    let doMap = () => new Promise((resolve, reject) => {
        map(data.data, emit);
        resolve();
    });
    await doMap();
    let outputMap = () => new Promise(async (resolve, reject) => {
        let promises = [];
        mapData.forEach(async mapItem => {

            const dynamoData = {
                TableName: "shuffleResults",
                Item: {
                    jobId: data.jobId,
                    key: mapItem.key,
                    value: mapItem.value,
                    id: uuid.v1(),
                    createdAt: timestamp,
                    updatedAt: timestamp
                }
            };

            promises.push(dynamoDb.put(dynamoData).promise());
        });
        await Promise.all(promises);
        resolve();
    });
    await outputMap();
    console.log(mapData);
    callback(null, JSON.stringify(mapData));
}