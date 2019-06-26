#!/bin/bash

aws configure set aws_access_key_id $1 --profile cloud
aws configure set aws_secret_access_key $2 --profile cloud