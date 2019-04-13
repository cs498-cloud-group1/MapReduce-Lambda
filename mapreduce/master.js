"use strict";
require("es6-promise").polyfill();
require("isomorphic-fetch");

const supportedDatasetTypes = [".txt"];

const mapperUrl =
  "https://113aq7atqd.execute-api.us-east-1.amazonaws.com/dev/mapper";
const reducerUrl =
  "https://113aq7atqd.execute-api.us-east-1.amazonaws.com/dev/reducer";

async function performMapReduce(record) {
  const datasetUrl = record.dynamodb.NewImage.url;
  if (!datasetUrl) {
    console.log("Lambda Triggered with no dataset");
    return;
  }
  //split data set
  const mapperData = {
    data: "This is some test words",
    mapFunction: `
        function map(data, emit) {
            let words = data.split(' ');
            words.forEach((word) => emit({key: word, value: 1 }));
        }
    `
  };
  //mapper
  let response = await fetch(mapperUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(mapperData)
  });
  console.log(response);
  //perform shuffle
  const reducerData = {
    data: "test",
    reduceFunction: `
        function reduce(data) {
            console.log(data);
        }
    `
  };
  //call reducers
  let response2 = await fetch(reducerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reducerData)
  });
  console.log(response2);
}

module.exports.master = async (event, context, callback) => {
  let jobs = [];
  event.Records.forEach(record => {
    let mapReduceJob = new Promise(async (resolve, reject) => {
      await performMapReduce(record);
      resolve();
    });
    jobs.push(mapReduceJob);
  });

  await Promise.all(jobs);
  return;
};
