# MapReduce-Lambda

## Setup
Setup aws creds locally

run `serverless deploy`

## to create a job
`curl -X POST https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/jobs --data '{ "jobName": "Test Job" }'`

## list jobs
`curl -X GET https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/jobs`
