
# coding: utf-8

# In[3]:

#new version! 
f1 = open("data_serverFormat.txt")
results = []
counter = 0
for line in f1:
    line = line.rstrip('\n')
    l = line.split(':', 1)
    temp = l[1].replace("}   ", "},")
    temp = temp.lstrip(" ")
    temp = temp.replace(':', ':[')
    temp = temp.replace("}", ']}')
    right = '"friends": "' + temp + '"'
    right = right.replace(", ]", ']')
    if (counter == 58227):
        l = '{"node" : "' + l[0] + '", ' + right +' } '
    else :
        l = '{"node" : "' + l[0] + '", ' + right +' },  '
    counter += 1
    results.append(l)


# In[5]:

with open('./v2smallworld.json', 'w') as f:
    for line in results:
        f.write("%s\n" % str(line))

