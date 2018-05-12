from __future__ import print_function
import boto3

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    
    obj = s3.get_object(Bucket=bucket, Key=key)
    
    rows = obj['Body'].read().split('\n')
    table = dynamodb.Table('musicloud-project-table')

    with table.batch_writer() as batch:
        for row in rows:
            try:
                index = row.split(',')[0]
                song  = row.split(',')[1]
                year = row.split(',')[2]
                artist = row.split(',')[3]
                genre = row.split(',')[4]
            
                
                if (index=="" or song=="" or year=="" or artist=="" or genre==""):
                    pass
                else:
                    batch.put_item(Item={
                        'index': index,
                        'song': song,
                        'year': year,
                        'artist': artist,
                        'genre': genre
                })
            except:
                pass
    
