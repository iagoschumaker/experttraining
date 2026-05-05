import urllib.request
import json

url = "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=human%20body%20outline%20filetype:svg&utf8=&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    for item in data['query']['search']:
        print(item['title'])
