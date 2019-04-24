# MapReduce-Lambda

## Setup
Setup aws creds locally

run `serverless deploy`

## to create a job
`curl -X POST https://orrk7q3ot4.execute-api.us-east-1.amazonaws./dev/jobs --data '{ "jobName": "Test Job", "url": "test", "map": "test", "reduce": "test" }'`

## list jobs
`curl -X GET https://XXXXXXX.execute-api.us-east-1.amazonaws.com/dev/jobs`
